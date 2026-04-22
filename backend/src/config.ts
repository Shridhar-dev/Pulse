import 'dotenv/config';

export const config = {
    // ─── Database ─────────────────────────────────────
    database: {
        url: process.env.DATABASE_URL || 'postgresql://pulse:pulse_secret@localhost:5442/pulse_db',
    },

    // ─── Redis ────────────────────────────────────────
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    // ─── BullMQ Queues ───────────────────────────────
    queue: {
        jobExecution: process.env.QUEUE_JOB_EXECUTION || 'pulse-jobs-execution',
        jobDlq: process.env.QUEUE_JOB_DLQ || 'pulse-jobs-dlq',
        jobEvents: process.env.QUEUE_JOB_EVENTS || 'pulse-jobs-events',
    },

    // ─── API ──────────────────────────────────────────
    api: {
        port: parseInt(process.env.API_PORT || '3002', 10),
        host: process.env.API_HOST || '0.0.0.0',
        jwtSecret: process.env.JWT_SECRET || 'pulse-dev-jwt-secret-change-in-production',
        jwtExpiry: process.env.JWT_EXPIRY || '24h',
    },

    // ─── Scheduler ────────────────────────────────────
    scheduler: {
        pollIntervalMs: parseInt(process.env.SCHEDULER_POLL_INTERVAL_MS || '1000', 10),
        batchSize: parseInt(process.env.SCHEDULER_BATCH_SIZE || '100', 10),
        lockTtlMs: parseInt(process.env.SCHEDULER_LOCK_TTL_MS || '30000', 10),
        nodeId: process.env.SCHEDULER_NODE_ID || `scheduler-${process.pid}`,
        concurrency: parseInt(process.env.SCHEDULER_CONCURRENCY || '3', 10),
    },

    // ─── Consumer ─────────────────────────────────────
    consumer: {
        concurrency: parseInt(process.env.CONSUMER_CONCURRENCY || '10', 10),
        maxRetries: parseInt(process.env.CONSUMER_MAX_RETRIES || '5', 10),
        retryBackoffBaseMs: parseInt(process.env.CONSUMER_RETRY_BACKOFF_BASE_MS || '1000', 10),
        executionTimeoutMs: parseInt(process.env.CONSUMER_EXECUTION_TIMEOUT_MS || '60000', 10),
    },

    // ─── Clock ────────────────────────────────────────
    clock: {
        skewToleranceMs: parseInt(process.env.CLOCK_SKEW_TOLERANCE_MS || '500', 10),
    },
} as const;
