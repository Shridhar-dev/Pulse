import { Worker, Job as BullJob } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { jobs, jobExecutions } from '../db/schema.js';
import { publishJobEvent, publishToDlq, type JobMessage } from '../lib/queue.js';
import { distributedLock } from '../lib/redis.js';
import { executeDelivery, type DeliveryResult } from './delivery.js';
import { config } from '../config.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('consumer-worker');

// ─── Worker Registry ────────────────────────────────
// Tracks the status of all embedded workers for observability.
export interface WorkerStatus {
    id: string;
    status: 'idle' | 'processing';
    currentJobId: string | null;
    currentJobName: string | null;
    lastActivityAt: string;
    jobsProcessed: number;
}

export const workerRegistry = new Map<string, WorkerStatus>();

/**
 * PulseConsumer — BullMQ worker that processes job execution messages.
 *
 * Exactly-Once Execution Guarantee:
 * ─────────────────────────────────
 * 1. Worker picks job from BullMQ queue
 * 2. Validates fencing token against DB (rejects stale locks)
 * 3. Creates execution record with unique executionId (DB dedup)
 * 4. Updates job status to RUNNING atomically
 * 5. Executes the delivery (HTTP/Webhook)
 * 6. Updates job status to COMPLETED/FAILED
 * 7. Job acknowledged by BullMQ only after successful processing
 *
 * If worker crashes between steps:
 * - BullMQ will redeliver the job (visibility timeout)
 * - Execution record exists → DB unique constraint prevents duplicate
 * - Fencing token check prevents stale completion
 */
export class PulseConsumer {
    private worker: Worker | null = null;
    private running = false;
    private readonly workerId: string;

    constructor(workerId?: string) {
        this.workerId = workerId || `worker-${process.pid}-${uuidv4().slice(0, 8)}`;
    }

    /**
     * Start consuming messages from the job execution queue.
     */
    async start(): Promise<void> {
        if (this.running) return;

        const redisUrl = new URL(config.redis.url);

        this.worker = new Worker(
            config.queue.jobExecution,
            async (bullJob: BullJob<JobMessage>) => {
                await this.processJob(bullJob.data);
            },
            {
                connection: {
                    host: redisUrl.hostname || 'localhost',
                    port: parseInt(redisUrl.port || '6379', 10),
                    password: redisUrl.password || undefined,
                },
                concurrency: 1, // Each PulseConsumer instance handles one at a time
                removeOnComplete: { count: 1000 },
                removeOnFail: { count: 5000 },
            }
        );

        this.running = true;

        this.worker.on('completed', (job: BullJob<JobMessage> | undefined) => {
            log.debug({ jobId: job?.data?.jobId }, 'BullMQ job completed');
        });

        this.worker.on('failed', (job: BullJob<JobMessage> | undefined, err: Error) => {
            log.error(
                { jobId: job?.data?.jobId, err: err.message },
                'BullMQ job failed'
            );
        });

        this.worker.on('error', (err: Error) => {
            log.error({ err }, 'BullMQ worker error');
        });

        // Register in the worker registry
        workerRegistry.set(this.workerId, {
            id: this.workerId,
            status: 'idle',
            currentJobId: null,
            currentJobName: null,
            lastActivityAt: new Date().toISOString(),
            jobsProcessed: 0,
        });

        log.info({ workerId: this.workerId }, 'Consumer worker running');
    }

    /**
     * Process a single job message.
     * This is the core exactly-once execution logic.
     */
    private async processJob(job: JobMessage): Promise<void> {
        const startTime = Date.now();

        // Update worker registry: processing
        const reg = workerRegistry.get(this.workerId);
        if (reg) {
            reg.status = 'processing';
            reg.currentJobId = job.jobId;
            reg.currentJobName = job.name;
            reg.lastActivityAt = new Date().toISOString();
        }

        log.info(
            {
                jobId: job.jobId,
                executionId: job.executionId,
                fencingToken: job.fencingToken,
                retryCount: job.retryCount,
            },
            'Processing job'
        );

        // ─── Step 1: Fencing Token Validation ────────────
        // Verify this fencing token is still the current one.
        // A higher fencing token means a newer scheduler took over.
        const [currentJob] = await db
            .select()
            .from(jobs)
            .where(eq(jobs.id, job.jobId))
            .limit(1);

        if (!currentJob) {
            log.warn({ jobId: job.jobId }, 'Job not found in database, skipping');
            return;
        }

        // Reject if job is already completed/dead/cancelled
        if (['COMPLETED', 'DEAD', 'CANCELLED'].includes(currentJob.status)) {
            log.info(
                { jobId: job.jobId, status: currentJob.status },
                'Job already in terminal state, skipping'
            );
            return;
        }

        // Fencing token check: reject stale executions
        if (
            currentJob.lockFencingToken !== null &&
            currentJob.lockFencingToken > job.fencingToken
        ) {
            log.warn(
                {
                    jobId: job.jobId,
                    messageFencingToken: job.fencingToken,
                    dbFencingToken: currentJob.lockFencingToken,
                },
                'Stale fencing token — newer execution superseded this one'
            );
            return;
        }

        // ─── Step 2: Create Execution Record (Idempotency) ──
        // The unique index on (job_id, execution_id) prevents duplicate records.
        try {
            await db.insert(jobExecutions).values({
                jobId: job.jobId,
                executionId: job.executionId,
                fencingToken: job.fencingToken,
                status: 'RUNNING',
                workerNodeId: this.workerId,
            });
        } catch (err: any) {
            if (err?.code === '23505') {
                // Duplicate execution ID — this job was already processed
                log.info(
                    { jobId: job.jobId, executionId: job.executionId },
                    'Execution already recorded (idempotent skip — exactly-once enforced)'
                );
                return;
            }
            throw err;
        }

        // ─── Step 3: Update Job to RUNNING ──────────────
        const [runningJob] = await db
            .update(jobs)
            .set({
                status: 'RUNNING',
                startedAt: new Date(),
                executionId: job.executionId,
            })
            .where(
                and(
                    eq(jobs.id, job.jobId),
                    eq(jobs.executionId, job.executionId) // Only if execution ID matches
                )
            )
            .returning();

        if (!runningJob) {
            log.warn({ jobId: job.jobId }, 'Could not update job to RUNNING (superseded)');
            return;
        }

        await publishJobEvent({
            jobId: job.jobId,
            executionId: job.executionId,
            event: 'STARTED',
            timestamp: new Date().toISOString(),
            details: { workerNode: this.workerId },
        });

        // ─── Step 4: Execute the delivery ───────────────
        let deliveryResult: DeliveryResult;

        try {
            deliveryResult = await executeDelivery(job);
        } catch (err: any) {
            deliveryResult = {
                success: false,
                error: err.message || 'Delivery execution error',
                durationMs: Date.now() - startTime,
            };
        }

        // ─── Step 5: Update final status ────────────────
        if (deliveryResult.success) {
            await this.handleSuccess(job, deliveryResult);
        } else {
            await this.handleFailure(job, deliveryResult);
        }

        // Update worker registry: back to idle
        const regDone = workerRegistry.get(this.workerId);
        if (regDone) {
            regDone.status = 'idle';
            regDone.currentJobId = null;
            regDone.currentJobName = null;
            regDone.lastActivityAt = new Date().toISOString();
            regDone.jobsProcessed++;
        }
    }

    /**
     * Handle successful job execution.
     */
    private async handleSuccess(job: JobMessage, result: DeliveryResult): Promise<void> {
        // Update job to COMPLETED
        await db
            .update(jobs)
            .set({
                status: 'COMPLETED',
                completedAt: new Date(),
                lockedBy: null,
                lockedAt: null,
            })
            .where(
                and(
                    eq(jobs.id, job.jobId),
                    eq(jobs.executionId, job.executionId)
                )
            );

        // Update execution record
        await db
            .update(jobExecutions)
            .set({
                status: 'COMPLETED',
                completedAt: new Date(),
                result: {
                    statusCode: result.statusCode,
                    durationMs: result.durationMs,
                    responseBody: result.responseBody,
                },
            })
            .where(
                and(
                    eq(jobExecutions.jobId, job.jobId),
                    eq(jobExecutions.executionId, job.executionId)
                )
            );

        // Publish completion event
        await publishJobEvent({
            jobId: job.jobId,
            executionId: job.executionId,
            event: 'COMPLETED',
            timestamp: new Date().toISOString(),
            details: {
                durationMs: result.durationMs,
                statusCode: result.statusCode,
            },
        });

        // ─── Recurring Job Re-scheduling ────────────────
        if (job.isRecurring && job.intervalMs) {
            const nextScheduledAt = new Date(Date.now() + job.intervalMs);

            await db
                .update(jobs)
                .set({
                    status: 'SCHEDULED',
                    scheduledAt: nextScheduledAt,
                    retryCount: 0,
                    lockedBy: null,
                    lockedAt: null,
                    lockFencingToken: null,
                    executionId: null,
                    startedAt: null,
                    completedAt: null,
                    failedAt: null,
                    errorMessage: null,
                })
                .where(eq(jobs.id, job.jobId));

            log.info(
                { jobId: job.jobId, nextScheduledAt, intervalMs: job.intervalMs },
                'Recurring job re-scheduled'
            );
        }

        // Release distributed lock
        await distributedLock.release(`job:${job.jobId}`, config.scheduler.nodeId);

        log.info(
            {
                jobId: job.jobId,
                executionId: job.executionId,
                durationMs: result.durationMs,
                statusCode: result.statusCode,
            },
            'Job completed successfully'
        );
    }

    /**
     * Handle failed job execution with retry logic.
     */
    private async handleFailure(job: JobMessage, result: DeliveryResult): Promise<void> {
        const nextRetryCount = job.retryCount + 1;
        const isRetryable = nextRetryCount < job.maxRetries;

        if (isRetryable) {
            // Schedule for retry with exponential backoff
            const backoffMs =
                config.consumer.retryBackoffBaseMs * Math.pow(2, job.retryCount);
            const nextScheduledAt = new Date(Date.now() + backoffMs);

            await db
                .update(jobs)
                .set({
                    status: 'SCHEDULED',  // Back to SCHEDULED for the scheduler to pick up
                    retryCount: nextRetryCount,
                    lockedBy: null,
                    lockedAt: null,
                    lockFencingToken: null,
                    executionId: null,
                    failedAt: new Date(),
                    errorMessage: result.error,
                    scheduledAt: nextScheduledAt,
                })
                .where(eq(jobs.id, job.jobId));

            // Update execution record
            await db
                .update(jobExecutions)
                .set({
                    status: 'FAILED',
                    completedAt: new Date(),
                    errorMessage: result.error,
                    result: {
                        statusCode: result.statusCode,
                        durationMs: result.durationMs,
                        responseBody: result.responseBody,
                        error: result.error,
                    },
                })
                .where(
                    and(
                        eq(jobExecutions.jobId, job.jobId),
                        eq(jobExecutions.executionId, job.executionId)
                    )
                );

            await publishJobEvent({
                jobId: job.jobId,
                executionId: job.executionId,
                event: 'RETRIED',
                timestamp: new Date().toISOString(),
                details: {
                    retryCount: nextRetryCount,
                    maxRetries: job.maxRetries,
                    nextScheduledAt: nextScheduledAt.toISOString(),
                    backoffMs,
                    error: result.error,
                },
            });

            log.warn(
                {
                    jobId: job.jobId,
                    retryCount: nextRetryCount,
                    maxRetries: job.maxRetries,
                    backoffMs,
                    nextScheduledAt,
                    error: result.error,
                },
                'Job failed, scheduled for retry'
            );
        } else {
            // Exhausted all retries — mark as DEAD
            await db
                .update(jobs)
                .set({
                    status: 'DEAD',
                    lockedBy: null,
                    lockedAt: null,
                    failedAt: new Date(),
                    errorMessage: `Exhausted all retries. Last error: ${result.error}`,
                })
                .where(eq(jobs.id, job.jobId));

            // Update execution record
            await db
                .update(jobExecutions)
                .set({
                    status: 'DEAD',
                    completedAt: new Date(),
                    errorMessage: result.error,
                    result: {
                        statusCode: result.statusCode,
                        durationMs: result.durationMs,
                        responseBody: result.responseBody,
                        error: result.error,
                    },
                })
                .where(
                    and(
                        eq(jobExecutions.jobId, job.jobId),
                        eq(jobExecutions.executionId, job.executionId)
                    )
                );

            // Send to Dead Letter Queue
            await publishToDlq(job, result.error || 'Unknown error');

            await publishJobEvent({
                jobId: job.jobId,
                executionId: job.executionId,
                event: 'DEAD',
                timestamp: new Date().toISOString(),
                details: {
                    totalRetries: nextRetryCount,
                    lastError: result.error,
                },
            });

            log.error(
                {
                    jobId: job.jobId,
                    totalRetries: nextRetryCount,
                    error: result.error,
                },
                'Job exhausted all retries — marked DEAD and sent to DLQ'
            );
        }

        // Release distributed lock
        await distributedLock.release(`job:${job.jobId}`, config.scheduler.nodeId);
    }

    /**
     * Stop the consumer gracefully.
     */
    async stop(): Promise<void> {
        this.running = false;
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
        }
        log.info({ workerId: this.workerId }, 'Consumer worker stopped');
    }
}
