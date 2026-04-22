import { Hono } from 'hono';
import { healthCheck as dbHealthCheck, getServerTime } from '../db/index.js';
import { redis } from '../lib/redis.js';
import { workerRegistry } from '../consumer/worker.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('health-routes');

export const healthRoutes = new Hono();

// ─── GET /health — Full system health check ─────────

healthRoutes.get('/', async (c) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // Database check
    const dbStart = Date.now();
    try {
        const healthy = await dbHealthCheck();
        checks.database = {
            status: healthy ? 'healthy' : 'unhealthy',
            latencyMs: Date.now() - dbStart,
        };
    } catch (err: any) {
        checks.database = {
            status: 'unhealthy',
            latencyMs: Date.now() - dbStart,
            error: err.message,
        };
    }

    // Redis check
    const redisStart = Date.now();
    try {
        const pong = await redis.ping();
        checks.redis = {
            status: pong === 'PONG' ? 'healthy' : 'unhealthy',
            latencyMs: Date.now() - redisStart,
        };
    } catch (err: any) {
        checks.redis = {
            status: 'unhealthy',
            latencyMs: Date.now() - redisStart,
            error: err.message,
        };
    }

    // Clock skew check
    try {
        const serverTime = await getServerTime();
        const localTime = new Date();
        const skewMs = Math.abs(serverTime.getTime() - localTime.getTime());

        checks.clockSkew = {
            status: skewMs < 1000 ? 'healthy' : 'warning',
            latencyMs: skewMs,
        };
    } catch (err: any) {
        checks.clockSkew = {
            status: 'unknown',
            error: err.message,
        };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    return c.json(
        {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks,
        },
        allHealthy ? 200 : 503
    );
});

// ─── GET /health/live — Liveness probe ──────────────

healthRoutes.get('/live', (c) => {
    return c.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// ─── GET /health/ready — Readiness probe ────────────

healthRoutes.get('/ready', async (c) => {
    try {
        const dbOk = await dbHealthCheck();
        const redisOk = (await redis.ping()) === 'PONG';

        if (dbOk && redisOk) {
            return c.json({ status: 'ready' });
        }
        return c.json({ status: 'not ready', database: dbOk, redis: redisOk }, 503);
    } catch {
        return c.json({ status: 'not ready' }, 503);
    }
});

// ─── GET /health/metrics — Queue & system metrics ───

healthRoutes.get('/metrics', async (c) => {
    try {
        const { jobExecutionQueue, jobEventsQueue, jobDlqQueue } = await import('../lib/queue.js');

        const [execCounts, eventCounts, dlqCounts] = await Promise.all([
            jobExecutionQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
            jobEventsQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
            jobDlqQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
        ]);

        // Redis memory usage
        let redisMemory = '0';
        try {
            const info = await redis.info('memory');
            const match = info.match(/used_memory_human:(.+)/);
            if (match) redisMemory = match[1].trim();
        } catch { /* ignore */ }

        // Redis connected clients
        let redisClients = 0;
        try {
            const info = await redis.info('clients');
            const match = info.match(/connected_clients:(\d+)/);
            if (match) redisClients = parseInt(match[1]);
        } catch { /* ignore */ }

        return c.json({
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            },
            redis: {
                memory: redisMemory,
                clients: redisClients,
            },
            queues: {
                execution: execCounts,
                events: eventCounts,
                dlq: dlqCounts,
            },
            workers: Array.from(workerRegistry.values()),
        });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});
