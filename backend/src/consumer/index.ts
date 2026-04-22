import { PulseConsumer } from './worker.js';
import { redis } from '../lib/redis.js';
import { closeQueues } from '../lib/queue.js';
import { createChildLogger } from '../lib/logger.js';
import { config } from '../config.js';

const log = createChildLogger('consumer-main');

async function startConsumer() {
    const workerId = `consumer-${process.pid}`;
    log.info({ workerId, concurrency: config.consumer.concurrency }, 'Starting Pulse Consumer');

    // Connect Redis
    await redis.connect();
    log.info('Redis connected');

    // Start consumers (multiple workers for concurrency)
    const workers: PulseConsumer[] = [];

    for (let i = 0; i < config.consumer.concurrency; i++) {
        const worker = new PulseConsumer(`${workerId}-${i}`);
        await worker.start();
        workers.push(worker);
    }

    log.info(
        { workerId, workerCount: workers.length },
        'All consumer workers running (BullMQ)'
    );

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        log.info({ signal }, 'Received shutdown signal');

        await Promise.all(workers.map((w) => w.stop()));
        await closeQueues();
        redis.disconnect();

        log.info('Consumer shutdown complete');
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

startConsumer().catch((err) => {
    log.error({ err }, 'Fatal consumer error');
    process.exit(1);
});
