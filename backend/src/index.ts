import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { timing } from 'hono/timing';

import { config } from './config.js';
import { authRoutes } from './api/auth.routes.js';
import { jobRoutes } from './api/job.routes.js';
import { healthRoutes } from './api/health.routes.js';
import { executeRoutes } from './api/execute.routes.js';
import { cronJobRoutes } from './api/cron-jobs.routes.js';
import { githubJobRoutes } from './api/github-jobs.routes.js';
import { redis } from './lib/redis.js';
import { closeQueues } from './lib/queue.js';
import { PulseScheduler } from './scheduler/scheduler.js';
import { PulseConsumer } from './consumer/worker.js';
import { pool } from './db/index.js';
import { createChildLogger } from './lib/logger.js';
import { cleanupOrphanedContainers } from './lib/docker-executor.js';

const log = createChildLogger('main');

// ─── Create Hono App ────────────────────────────────

const app = new Hono();

// ─── Middleware ──────────────────────────────────────

app.use('*', cors());
app.use('*', timing());
app.use(
    '*',
    honoLogger((msg, ...rest) => {
        log.info(msg);
    })
);

// ─── Request ID middleware ──────────────────────────

app.use('*', async (c, next) => {
    const requestId =
        c.req.header('X-Request-Id') || crypto.randomUUID();
    c.header('X-Request-Id', requestId);
    await next();
});

// ─── Routes ─────────────────────────────────────────

app.get('/', (c) => {
    return c.json({
        name: 'Pulse',
        description: 'High-Throughput Distributed Task Scheduling Engine',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth/*',
            jobs: '/api/jobs/*',
            health: '/api/health/*',
            cronJobs: '/api/cron-jobs/*',
            githubJobs: '/api/github-jobs/*',
        },
    });
});

app.route('/api/auth', authRoutes);
app.route('/api/jobs', jobRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/execute', executeRoutes);
app.route('/api/cron-jobs', cronJobRoutes);
app.route('/api/github-jobs', githubJobRoutes);

// ─── Global Error Handler ───────────────────────────

app.onError((err, c) => {
    log.error({ err, path: c.req.path, method: c.req.method }, 'Unhandled error');
    return c.json({ error: 'Internal server error' }, 500);
});

// ─── 404 Handler ────────────────────────────────────

app.notFound((c) => {
    return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// ─── Main startup ───────────────────────────────────

async function main() {
    log.info('╔══════════════════════════════════════════╗');
    log.info('║         PULSE SCHEDULING ENGINE          ║');
    log.info('║    High-Throughput • Exactly-Once • HA   ║');
    log.info('╚══════════════════════════════════════════╝');

    // Connect Redis
    try {
        await redis.connect();
        log.info('✓ Redis connected');
    } catch (err) {
        log.error({ err }, '✗ Redis connection failed');
    }

    // Start scheduler instances (embedded mode — can also be run standalone)
    // Multiple schedulers safely compete for locks via distributed locking.
    const schedulers: PulseScheduler[] = [];
    try {
        for (let i = 0; i < config.scheduler.concurrency; i++) {
            const scheduler = new PulseScheduler(`scheduler-${i}`);
            await scheduler.start();
            schedulers.push(scheduler);
        }
        log.info(`✓ ${schedulers.length} scheduler instances started`);
    } catch (err) {
        log.warn({ err }, '⚠ Scheduler start failed');
    }

    // Start consumer workers (embedded mode — can also be run standalone)
    const consumers: PulseConsumer[] = [];
    try {
        for (let i = 0; i < config.consumer.concurrency; i++) {
            const consumer = new PulseConsumer(`embedded-worker-${i}`);
            await consumer.start();
            consumers.push(consumer);
        }
        log.info(`✓ ${consumers.length} consumer workers started (BullMQ)`);
    } catch (err) {
        log.warn({ err }, '⚠ Consumer workers start failed');
    }

    // Periodic cleanup of orphaned Docker containers (every 5 minutes)
    setInterval(async () => {
        try {
            const cleaned = await cleanupOrphanedContainers();
            if (cleaned > 0) {
                log.info({ cleaned }, '🐳 Cleaned up orphaned Docker containers');
            }
        } catch (err) {
            log.warn({ err }, 'Docker container cleanup error');
        }
    }, 300000);

    // Start HTTP server
    const server = serve(
        {
            fetch: app.fetch,
            port: config.api.port,
            hostname: config.api.host,
        },
        (info) => {
            const port = process.env.PORT || 3002;
            console.log("Forcing backend restart...");
            log.info(`Pulse orchestrator starting on port ${port}...`);
            log.info(`✓ API server listening on http://${info.address}:${info.port}`);
            log.info('');
            log.info('   System ready! All components operational.');
            log.info('');
        }
    );

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        log.info({ signal }, 'Graceful shutdown initiated...');

        // Stop schedulers
        await Promise.all(schedulers.map((s) => s.stop()));

        // Stop consumers
        await Promise.all(consumers.map((c) => c.stop()));

        // Close BullMQ queues
        await closeQueues();

        // Disconnect Redis
        redis.disconnect();

        // Close DB pool
        await pool.end();

        log.info('All components shut down. Goodbye!');
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
        log.error({ err }, 'Uncaught exception');
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (err) => {
        log.error({ err }, 'Unhandled rejection');
        shutdown('unhandledRejection');
    });
}

main().catch((err) => {
    log.error({ err }, 'Fatal startup error');
    process.exit(1);
});
