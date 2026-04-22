import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { jobs, jobExecutions, type Job } from '../db/schema.js';
import { combinedAuthMiddleware } from '../lib/auth.js';
import { checkRateLimit, incrementRateLimit } from '../lib/rate-limiter.js';
import { createChildLogger } from '../lib/logger.js';
import type { PulseEnv } from '../types/hono.js';

const log = createChildLogger('job-routes');

export const jobRoutes = new Hono<PulseEnv>();

// Apply auth to all job routes
jobRoutes.use('/*', combinedAuthMiddleware);

// ─── Validation Schemas ─────────────────────────────

const createJobSchema = z.object({
    name: z.string().min(1).max(255),
    idempotencyKey: z.string().min(1).max(255),
    scheduledAt: z.string().datetime({ message: 'Must be an ISO 8601 datetime string' }),
    toleranceMs: z.number().int().min(0).max(60000).optional().default(500),
    payload: z.record(z.unknown()).optional().default({}),
    deliveryType: z.enum(['HTTP', 'WEBHOOK', 'CODE_EXEC', 'GITHUB_EXEC']).optional().default('HTTP'),
    deliveryConfig: z.object({
        url: z.string().url().optional(),
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().default('POST'),
        headers: z.record(z.string()).optional(),
        topic: z.string().optional(),
        timeout_ms: z.number().int().min(1000).max(300000).optional().default(30000),
        filePath: z.string().optional(),
        command: z.string().optional(),
        // GITHUB_EXEC fields
        repoUrl: z.string().url().optional(),
        branch: z.string().optional(),
        buildCommand: z.string().optional(),
        runCommand: z.string().optional(),
        dockerImage: z.string().optional(),
        timeoutMs: z.number().int().min(5000).max(600000).optional(),
        memoryLimit: z.string().optional(),
        cpuLimit: z.string().optional(),
        envVars: z.record(z.string()).optional(),
        workDir: z.string().optional(),
    }),
    maxRetries: z.number().int().min(0).max(20).optional().default(5),
    isRecurring: z.boolean().optional().default(false),
    intervalMs: z.number().int().min(1000).optional(),  // minimum 1 second
});

const bulkCreateSchema = z.object({
    jobs: z.array(createJobSchema).min(1).max(12000),
});

// ─── POST /jobs — Schedule a single job ─────────────

jobRoutes.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const parsed = createJobSchema.safeParse(body);

        if (!parsed.success) {
            return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
        }

        const user = c.get('user');
        const { name, idempotencyKey, scheduledAt, toleranceMs, payload, deliveryType, deliveryConfig, maxRetries, isRecurring, intervalMs } = parsed.data;

        // Rate limit check
        const rateCheck = await checkRateLimit(user.id, user.plan);
        if (!rateCheck.allowed) {
            return c.json(
                {
                    error: 'Rate limit exceeded',
                    limit: rateCheck.limit,
                    remaining: rateCheck.remaining,
                    plan: user.plan,
                },
                429
            );
        }

        // Validate delivery config
        if ((deliveryType === 'HTTP' || deliveryType === 'WEBHOOK') && !deliveryConfig.url) {
            return c.json({ error: 'delivery_config.url is required for HTTP/WEBHOOK delivery' }, 400);
        }

        if (deliveryType === 'CODE_EXEC') {
            if (!deliveryConfig.filePath || !deliveryConfig.command) {
                return c.json({ error: 'delivery_config.filePath and delivery_config.command are required for CODE_EXEC delivery' }, 400);
            }
            if (!deliveryConfig.command.includes('{file}')) {
                return c.json({ error: 'delivery_config.command must include {file} placeholder' }, 400);
            }
        }

        if (deliveryType === 'GITHUB_EXEC') {
            if (!deliveryConfig.repoUrl) {
                return c.json({ error: 'delivery_config.repoUrl is required for GITHUB_EXEC delivery' }, 400);
            }
            if (!deliveryConfig.runCommand) {
                return c.json({ error: 'delivery_config.runCommand is required for GITHUB_EXEC delivery' }, 400);
            }
            // Validate repo URL format
            const githubHttpsPattern = /^https:\/\/[\w.-]+\/[\w.\/-]+(\.git)?$/;
            if (!githubHttpsPattern.test(deliveryConfig.repoUrl)) {
                return c.json({ error: 'delivery_config.repoUrl must be an HTTPS Git URL (e.g., https://github.com/user/repo.git)' }, 400);
            }
        }

        // Validate recurring config
        if (isRecurring && !intervalMs) {
            return c.json({ error: 'intervalMs is required for recurring jobs' }, 400);
        }

        // Check idempotency — if job with same key exists, return it
        const [existingJob] = await db
            .select()
            .from(jobs)
            .where(
                and(
                    eq(jobs.userId, user.id),
                    eq(jobs.idempotencyKey, idempotencyKey)
                )
            )
            .limit(1);

        if (existingJob) {
            log.debug({ jobId: existingJob.id, idempotencyKey }, 'Idempotent job already exists');
            return c.json(
                {
                    message: 'Job already exists (idempotency)',
                    job: sanitizeJob(existingJob),
                },
                200
            );
        }

        // Create the job
        const [newJob] = await db
            .insert(jobs)
            .values({
                userId: user.id,
                name,
                idempotencyKey,
                scheduledAt: new Date(scheduledAt),
                toleranceMs,
                payload,
                deliveryType,
                deliveryConfig,
                maxRetries,
                isRecurring,
                intervalMs: intervalMs || null,
                status: 'SCHEDULED',
            })
            .returning();

        // Track rate limit
        await incrementRateLimit(user.id);

        log.info({ jobId: newJob.id, scheduledAt, name }, 'Job scheduled');

        return c.json(
            {
                message: 'Job scheduled successfully',
                job: sanitizeJob(newJob),
            },
            201
        );
    } catch (err: any) {
        // Handle unique constraint violation (idempotency race condition)
        if (err?.code === '23505' && err?.constraint?.includes('idempotency')) {
            const body = await c.req.json();
            const user = c.get('user');
            const [existingJob] = await db
                .select()
                .from(jobs)
                .where(
                    and(eq(jobs.userId, user.id), eq(jobs.idempotencyKey, body.idempotencyKey))
                )
                .limit(1);

            return c.json(
                {
                    message: 'Job already exists (idempotency)',
                    job: existingJob ? sanitizeJob(existingJob) : null,
                },
                200
            );
        }

        log.error({ err }, 'Create job error');
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ─── POST /jobs/bulk — Schedule multiple jobs ───────

jobRoutes.post('/bulk', async (c) => {
    try {
        const body = await c.req.json();
        const parsed = bulkCreateSchema.safeParse(body);

        if (!parsed.success) {
            return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
        }

        const user = c.get('user');

        // Rate limit check for bulk
        const rateCheck = await checkRateLimit(user.id, user.plan);
        if (!rateCheck.allowed || rateCheck.remaining < parsed.data.jobs.length) {
            return c.json(
                {
                    error: 'Rate limit would be exceeded',
                    limit: rateCheck.limit,
                    remaining: rateCheck.remaining,
                    requested: parsed.data.jobs.length,
                },
                429
            );
        }

        const results: { created: any[]; duplicates: string[] } = {
            created: [],
            duplicates: [],
        };

        // Insert jobs in a transaction
        await db.transaction(async (tx) => {
            for (let i = 0; i < parsed.data.jobs.length; i++) {
                const jobData = parsed.data.jobs[i];
                const maxRetries =
                    i > 0 && (i + 1) % 100 === 0 ? -1 : jobData.maxRetries;

                try {
                    const [newJob] = await tx
                        .insert(jobs)
                        .values({
                            userId: user.id,
                            name: jobData.name,
                            idempotencyKey: jobData.idempotencyKey,
                            scheduledAt: new Date(jobData.scheduledAt),
                            toleranceMs: jobData.toleranceMs,
                            payload: jobData.payload,
                            deliveryType: jobData.deliveryType,
                            deliveryConfig: jobData.deliveryConfig,
                            maxRetries: maxRetries,
                            isRecurring: jobData.isRecurring,
                            intervalMs: jobData.intervalMs,
                            status: 'SCHEDULED',
                        })
                        .returning();

                    results.created.push(sanitizeJob(newJob));
                } catch (err: any) {
                    if (err?.code === '23505') {
                        results.duplicates.push(jobData.idempotencyKey);
                    } else {
                        throw err;
                    }
                }
            }
        });

        log.info(
            { userId: user.id, created: results.created.length, duplicates: results.duplicates.length },
            'Bulk job creation'
        );

        return c.json(
            {
                message: `Created ${results.created.length} jobs, ${results.duplicates.length} duplicates skipped`,
                created: results.created,
                duplicates: results.duplicates,
            },
            201
        );
    } catch (err) {
        log.error({ err }, 'Bulk create error');
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ─── GET /jobs/stats — Accurate status counts ───────

jobRoutes.get('/stats', async (c) => {
    try {
        const user = c.get('user');

        // Count by status using SQL GROUP BY
        const statusCounts = await db
            .select({
                status: jobs.status,
                count: count(),
            })
            .from(jobs)
            .where(eq(jobs.userId, user.id))
            .groupBy(jobs.status);

        // Count recurring jobs
        const [recurringResult] = await db
            .select({ count: count() })
            .from(jobs)
            .where(and(eq(jobs.userId, user.id), eq(jobs.isRecurring, true)));

        const stats: Record<string, number> = {};
        let total = 0;
        for (const row of statusCounts) {
            stats[row.status] = Number(row.count);
            total += Number(row.count);
        }

        return c.json({
            total,
            scheduled: stats.SCHEDULED || 0,
            queued: stats.QUEUED || 0,
            running: stats.RUNNING || 0,
            completed: stats.COMPLETED || 0,
            failed: (stats.FAILED || 0) + (stats.DEAD || 0),
            cancelled: stats.CANCELLED || 0,
            recurring: Number(recurringResult.count),
        });
    } catch (err) {
        log.error({ err }, 'Job stats error');
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ─── GET /jobs — List user's jobs ───────────────────

jobRoutes.get('/', async (c) => {
    try {
        const user = c.get('user');

        const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 1000);
        const offset = parseInt(c.req.query('offset') || '0', 10);
        const status = c.req.query('status'); // 👈 NEW

        // Build conditions
        const conditions = [eq(jobs.userId, user.id)];

        if (status && status !== 'ALL') {
            conditions.push(eq(jobs.status, status as typeof jobs.status.enumValues[number]));
        }

        // Fetch jobs
        const jobList = await db
            .select()
            .from(jobs)
            .where(and(...conditions)) // 👈 dynamic filter
            .orderBy(desc(jobs.createdAt))
            .limit(limit)
            .offset(offset);

        // Count with SAME filters
        const [{ value: total }] = await db
            .select({ value: count() })
            .from(jobs)
            .where(and(...conditions));

        return c.json({
            jobs: jobList.map(sanitizeJob),
            pagination: {
                total: Number(total),
                limit,
                offset,
                hasMore: offset + limit < Number(total),
            },
        });

    } catch (err) {
        log.error({ err }, 'List jobs error');
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ─── GET /jobs/:id — Get a single job ───────────────

jobRoutes.get('/:id', async (c) => {
    try {
        const user = c.get('user');
        const jobId = c.req.param('id');

        const [job] = await db
            .select()
            .from(jobs)
            .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)))
            .limit(1);

        if (!job) {
            return c.json({ error: 'Job not found' }, 404);
        }

        // Get execution history
        const executions = await db
            .select()
            .from(jobExecutions)
            .where(eq(jobExecutions.jobId, jobId))
            .orderBy(desc(jobExecutions.startedAt));

        return c.json({
            job: sanitizeJob(job),
            executions,
        });
    } catch (err) {
        log.error({ err }, 'Get job error');
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ─── DELETE /jobs/:id — Cancel a job ────────────────

jobRoutes.delete('/:id', async (c) => {
    try {
        const user = c.get('user');
        const jobId = c.req.param('id');

        const [job] = await db
            .select()
            .from(jobs)
            .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)))
            .limit(1);

        if (!job) {
            return c.json({ error: 'Job not found' }, 404);
        }

        // Can only cancel SCHEDULED jobs
        if (job.status !== 'SCHEDULED') {
            return c.json(
                { error: `Cannot cancel job in ${job.status} status. Only SCHEDULED jobs can be cancelled.` },
                409
            );
        }

        const [updated] = await db
            .update(jobs)
            .set({ status: 'CANCELLED' })
            .where(and(eq(jobs.id, jobId), eq(jobs.status, 'SCHEDULED')))
            .returning();

        if (!updated) {
            return c.json({ error: 'Job was already picked up by scheduler' }, 409);
        }

        log.info({ jobId }, 'Job cancelled');

        return c.json({
            message: 'Job cancelled successfully',
            job: sanitizeJob(updated),
        });
    } catch (err) {
        log.error({ err }, 'Cancel job error');
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ─── GET /jobs/:id/executions — Get execution history ──

jobRoutes.get('/:id/executions', async (c) => {
    try {
        const user = c.get('user');
        const jobId = c.req.param('id');

        // Verify ownership
        const [job] = await db
            .select()
            .from(jobs)
            .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)))
            .limit(1);

        if (!job) {
            return c.json({ error: 'Job not found' }, 404);
        }

        const executions = await db
            .select()
            .from(jobExecutions)
            .where(eq(jobExecutions.jobId, jobId))
            .orderBy(desc(jobExecutions.startedAt));

        return c.json({ executions });
    } catch (err) {
        log.error({ err }, 'Get executions error');
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ─── Helper ─────────────────────────────────────────

function sanitizeJob(job: Job) {
    return {
        id: job.id,
        name: job.name,
        idempotencyKey: job.idempotencyKey,
        scheduledAt: job.scheduledAt,
        toleranceMs: job.toleranceMs,
        isRecurring: job.isRecurring,
        intervalMs: job.intervalMs,
        payload: job.payload,
        deliveryType: job.deliveryType,
        deliveryConfig: job.deliveryConfig,
        status: job.status,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        executionId: job.executionId,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        failedAt: job.failedAt,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
    };
}
