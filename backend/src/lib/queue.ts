import { Queue } from 'bullmq';
import { config } from '../config.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('queue');

// ─── BullMQ Connection Config ───────────────────────

const connectionOpts = {
    connection: {
        host: new URL(config.redis.url).hostname || 'localhost',
        port: parseInt(new URL(config.redis.url).port || '6379', 10),
        password: new URL(config.redis.url).password || undefined,
    },
};

// ─── Queues ─────────────────────────────────────────

export const jobExecutionQueue = new Queue(config.queue.jobExecution, {
    ...connectionOpts,
    defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 1, // Retries are managed by Pulse's own retry logic
    },
});

export const jobEventsQueue = new Queue(config.queue.jobEvents, {
    ...connectionOpts,
    defaultJobOptions: {
        removeOnComplete: { count: 5000 },
        removeOnFail: { count: 1000 },
    },
});

export const jobDlqQueue = new Queue(config.queue.jobDlq, {
    ...connectionOpts,
    defaultJobOptions: {
        removeOnComplete: false, // Keep DLQ entries
        removeOnFail: false,
    },
});

// ─── Message Types ──────────────────────────────────

export interface JobMessage {
    jobId: string;
    userId: string;
    executionId: string;
    fencingToken: number;
    name: string;
    payload: Record<string, unknown>;
    deliveryType: string;
    deliveryConfig: Record<string, unknown>;
    scheduledAt: string;
    retryCount: number;
    maxRetries: number;
    isRecurring: boolean;
    intervalMs: number | null;
    enqueuedAt: string;
}

export interface JobEventMessage {
    jobId: string;
    executionId: string;
    event: 'QUEUED' | 'STARTED' | 'COMPLETED' | 'FAILED' | 'DEAD' | 'RETRIED';
    timestamp: string;
    details?: Record<string, unknown>;
}

// ─── Publishing helpers ─────────────────────────────

export async function publishJobForExecution(job: JobMessage): Promise<void> {
    await jobExecutionQueue.add(job.jobId, job, {
        jobId: job.executionId, // Use executionId as BullMQ jobId for deduplication
    });

    log.debug({ jobId: job.jobId }, 'Published job to execution queue');
}

export async function publishJobEvent(event: JobEventMessage): Promise<void> {
    await jobEventsQueue.add(event.event, event);
}

export async function publishToDlq(job: JobMessage, error: string): Promise<void> {
    await jobDlqQueue.add(job.jobId, {
        ...job,
        error,
        dlqTimestamp: new Date().toISOString(),
    });

    log.warn({ jobId: job.jobId }, 'Sent to DLQ');
}

// ─── Graceful shutdown ──────────────────────────────

export async function closeQueues(): Promise<void> {
    await Promise.all([
        jobExecutionQueue.close(),
        jobEventsQueue.close(),
        jobDlqQueue.close(),
    ]);
    log.info('All BullMQ queues closed');
}
