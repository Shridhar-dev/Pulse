import { PulseScheduler } from './scheduler.js';
import { redis } from '../lib/redis.js';
import { closeQueues } from '../lib/queue.js';
import { createChildLogger } from '../lib/logger.js';
import { config } from '../config.js';

const log = createChildLogger('scheduler-main');

async function startScheduler() {
    log.info({ nodeId: config.scheduler.nodeId }, 'Starting Pulse Scheduler');

    // Connect Redis
    await redis.connect();
    log.info('Redis connected');

    // Start the scheduler
    const scheduler = new PulseScheduler();
    await scheduler.start();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        log.info({ signal }, 'Received shutdown signal');
        await scheduler.stop();
        await closeQueues();
        redis.disconnect();
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    log.info('Pulse Scheduler is running');
}

startScheduler().catch((err) => {
    log.error({ err }, 'Fatal scheduler error');
    process.exit(1);
});
