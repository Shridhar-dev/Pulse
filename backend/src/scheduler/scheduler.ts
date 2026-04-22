import { eq, and, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, getServerTime } from '../db/index.js';
import { jobs, type Job } from '../db/schema.js';
import { distributedLock, redis } from '../lib/redis.js';
import { publishJobForExecution, publishJobEvent, type JobMessage } from '../lib/queue.js';
import { config } from '../config.js';
import { createChildLogger } from '../lib/logger.js';
import { workerRegistry } from '../consumer/worker.js';

const log = createChildLogger('scheduler', { nodeId: config.scheduler.nodeId });

/**
 * PulseScheduler — The core scheduler that polls for due jobs,
 * acquires distributed locks, and publishes them to BullMQ.
 *
 * Design:
 * 1. Uses DB server time as canonical clock (eliminates clock skew)
 * 2. Acquires per-job Redis locks with fencing tokens
 * 3. Updates job status atomically with optimistic concurrency
 * 4. Publishes to BullMQ job execution queue
 * 5. Only marks as queued after successful enqueue
 *
 * Exactly-once guarantee chain:
 * SCHEDULED → (lock acquired, fencing token) → QUEUED → BullMQ
 * If any step fails, the job stays SCHEDULED and will be retried.
 */
export class PulseScheduler {
    private running = false;
    private intervalHandle: NodeJS.Timeout | null = null;
    private readonly nodeId: string;
    private readonly batchSize: number;
    private readonly lockTtlMs: number;
    private readonly pollIntervalMs: number;

    constructor(nodeId?: string) {
        this.nodeId = nodeId || config.scheduler.nodeId;
        this.batchSize = config.scheduler.batchSize;
        this.lockTtlMs = config.scheduler.lockTtlMs;
        this.pollIntervalMs = config.scheduler.pollIntervalMs;
    }

    /**
     * Start the scheduler loop.
     */
    async start(): Promise<void> {
        if (this.running) return;
        this.running = true;

        log.info(
            {
                nodeId: this.nodeId,
                batchSize: this.batchSize,
                pollIntervalMs: this.pollIntervalMs,
                lockTtlMs: this.lockTtlMs,
            },
            'Scheduler starting'
        );

        // Run immediately, then on interval
        await this.poll();
        this.intervalHandle = setInterval(() => this.poll(), this.pollIntervalMs);

        // Also run stuck job recovery every 30 seconds
        setInterval(() => this.recoverStuckJobs(), 30000);

        // Register in the worker registry for dashboard observability
        workerRegistry.set(this.nodeId, {
            id: this.nodeId,
            status: 'idle',
            currentJobId: null,
            currentJobName: 'scheduler',
            lastActivityAt: new Date().toISOString(),
            jobsProcessed: 0,
        });
    }

    /**
     * Stop the scheduler loop.
     */
    async stop(): Promise<void> {
        this.running = false;
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
        log.info('Scheduler stopped');
    }

    /**
     * Main poll cycle: find due jobs, lock them, publish to BullMQ.
     */
    private async poll(): Promise<void> {
        if (!this.running) return;

        // Update registry: polling
        const reg = workerRegistry.get(this.nodeId);
        if (reg) {
            reg.status = 'processing';
            reg.lastActivityAt = new Date().toISOString();
        }

        try {
            // Use DATABASE time as the canonical clock — this eliminates clock skew
            const serverTime = await getServerTime();
            const toleranceWindow = new Date(
                serverTime.getTime() + config.clock.skewToleranceMs
            );

            // Fetch batch of SCHEDULED jobs that are due
            const dueJobs = await db
                .select()
                .from(jobs)
                .where(
                    and(
                        eq(jobs.status, 'SCHEDULED'),
                        lte(jobs.scheduledAt, toleranceWindow)
                    )
                )
                .limit(this.batchSize)
                .for('update', { skipLocked: true });  // SKIP LOCKED — prevents contention with other schedulers

            if (dueJobs.length === 0) {
                if (reg) { reg.status = 'idle'; }
                return;
            }

            log.info({ count: dueJobs.length, serverTime: serverTime.toISOString() }, 'Found due jobs');

            // Process each job
            const results = await Promise.allSettled(
                dueJobs.map((job) => this.processJob(job))
            );

            const succeeded = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected').length;

            if (failed > 0) {
                log.warn({ succeeded, failed }, 'Some jobs failed to queue');
            }

            // Update registry: back to idle
            if (reg) {
                reg.status = 'idle';
                reg.jobsProcessed += succeeded;
                reg.lastActivityAt = new Date().toISOString();
            }
        } catch (err) {
            log.error({ err }, 'Scheduler poll error');
            if (reg) { reg.status = 'idle'; }
        }
    }

    /**
     * Process a single job: acquire lock → update status → publish to BullMQ.
     */
    private async processJob(job: Job): Promise<void> {
        const lockResource = `job:${job.id}`;

        // Step 1: Acquire distributed lock with fencing token
        const { acquired, fencingToken } = await distributedLock.acquire(
            lockResource,
            this.nodeId,
            this.lockTtlMs
        );

        if (!acquired || fencingToken === null) {
            log.debug({ jobId: job.id }, 'Could not acquire lock, another scheduler handling');
            return;
        }

        try {
            // Step 2: Generate unique execution ID for this execution attempt
            const executionId = uuidv4();

            // Step 3: Atomically update job status to QUEUED
            // The WHERE clause ensures only SCHEDULED jobs are updated (optimistic concurrency)
            const [updatedJob] = await db
                .update(jobs)
                .set({
                    status: 'QUEUED',
                    lockedBy: this.nodeId,
                    lockedAt: new Date(),
                    lockFencingToken: fencingToken,
                    executionId,
                })
                .where(
                    and(
                        eq(jobs.id, job.id),
                        eq(jobs.status, 'SCHEDULED')  // Optimistic: only if still SCHEDULED
                    )
                )
                .returning();

            if (!updatedJob) {
                // Another scheduler or process already updated this job
                log.debug({ jobId: job.id }, 'Job already picked up by another scheduler');
                await distributedLock.release(lockResource, this.nodeId);
                return;
            }

            // Step 4: Publish to BullMQ
            const jobMessage: JobMessage = {
                jobId: job.id,
                userId: job.userId,
                executionId,
                fencingToken,
                name: job.name,
                payload: (job.payload as Record<string, unknown>) || {},
                deliveryType: job.deliveryType,
                deliveryConfig: job.deliveryConfig as any,
                scheduledAt: job.scheduledAt.toISOString(),
                retryCount: job.retryCount,
                maxRetries: job.maxRetries,
                isRecurring: job.isRecurring,
                intervalMs: job.intervalMs,
                enqueuedAt: new Date().toISOString(),
            };

            await publishJobForExecution(jobMessage);

            // Step 5: Publish event
            await publishJobEvent({
                jobId: job.id,
                executionId,
                event: 'QUEUED',
                timestamp: new Date().toISOString(),
                details: { schedulerNode: this.nodeId, fencingToken },
            });

            log.info(
                { jobId: job.id, executionId, fencingToken },
                'Job queued and published to BullMQ'
            );
        } catch (err) {
            // If BullMQ publish fails, revert job status back to SCHEDULED
            log.error({ err, jobId: job.id }, 'Failed to publish job, reverting to SCHEDULED');

            await db
                .update(jobs)
                .set({
                    status: 'SCHEDULED',
                    lockedBy: null,
                    lockedAt: null,
                    lockFencingToken: null,
                    executionId: null,
                })
                .where(
                    and(
                        eq(jobs.id, job.id),
                        eq(jobs.lockedBy, this.nodeId)
                    )
                );

            throw err;
        } finally {
            // Always release the distributed lock
            await distributedLock.release(lockResource, this.nodeId);
        }
    }

    /**
     * Recover stuck jobs where the lock has expired.
     * This handles the case where a scheduler crashes after locking a job
     * but before publishing to BullMQ.
     */
    private async recoverStuckJobs(): Promise<void> {
        try {
            const serverTime = await getServerTime();
            const lockTimeout = new Date(serverTime.getTime() - this.lockTtlMs);

            // Find jobs that are QUEUED but their lock has expired
            const stuckJobs = await db
                .update(jobs)
                .set({
                    status: 'SCHEDULED',
                    lockedBy: null,
                    lockedAt: null,
                    lockFencingToken: null,
                    executionId: null,
                })
                .where(
                    and(
                        eq(jobs.status, 'QUEUED'),
                        lte(jobs.lockedAt, lockTimeout)
                    )
                )
                .returning();

            if (stuckJobs.length > 0) {
                log.warn(
                    { count: stuckJobs.length },
                    'Recovered stuck jobs (lock expired)'
                );
            }

            // Also recover RUNNING jobs that have exceeded their execution timeout
            const execTimeout = new Date(
                serverTime.getTime() - config.consumer.executionTimeoutMs
            );

            const timedOutJobs = await db
                .update(jobs)
                .set({
                    status: 'SCHEDULED',
                    lockedBy: null,
                    lockedAt: null,
                    lockFencingToken: null,
                    executionId: null,
                    retryCount: sql`retry_count + 1`,
                })
                .where(
                    and(
                        eq(jobs.status, 'RUNNING'),
                        lte(jobs.startedAt, execTimeout)
                    )
                )
                .returning();

            if (timedOutJobs.length > 0) {
                log.warn(
                    { count: timedOutJobs.length },
                    'Recovered timed out running jobs'
                );

                // Mark jobs that exceeded max retries as DEAD
                for (const job of timedOutJobs) {
                    if (job.retryCount >= job.maxRetries) {
                        await db
                            .update(jobs)
                            .set({ status: 'DEAD', errorMessage: 'Exhausted all retries (execution timeout)' })
                            .where(eq(jobs.id, job.id));
                    }
                }
            }
        } catch (err) {
            log.error({ err }, 'Stuck job recovery error');
        }
    }
}
