import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { jobs, jobExecutions } from '../db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { createChildLogger } from '../lib/logger.js';
import { authMiddleware } from '../lib/auth.js';
import { validateGithubRepoUrl } from '../lib/docker-executor.js';
import type { PulseEnv } from '../types/hono.js';

const log = createChildLogger('github-jobs');

export const githubJobRoutes = new Hono<PulseEnv>();

// Apply auth middleware
githubJobRoutes.use('*', authMiddleware);

// ─── Validation ─────────────────────────────────────

const createGithubJobSchema = z.object({
    name: z.string().min(1).max(255),
    repoUrl: z.string().url(),
    branch: z.string().optional().default('main'),
    buildCommand: z.string().optional(),
    runCommand: z.string().min(1),
    dockerImage: z.string().optional().default('node:22-alpine'),
    timeoutMs: z.number().int().min(5000).max(600000).optional().default(300000),
    memoryLimit: z.string().optional().default('512m'),
    cpuLimit: z.string().optional().default('1.0'),
    envVars: z.record(z.string()).optional(),
    workDir: z.string().optional(),
    // Scheduling
    scheduledAt: z.string().datetime().optional(),
    isRecurring: z.boolean().optional().default(false),
    intervalMs: z.number().int().min(60000).optional(), // min 1 minute for GitHub jobs
    maxRetries: z.number().int().min(0).max(10).optional().default(3),
});

// ─── POST /api/github-jobs — Create a GitHub repo execution job ───

githubJobRoutes.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const parsed = createGithubJobSchema.safeParse(body);

        if (!parsed.success) {
            return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
        }

        const user = c.get('user');
        const data = parsed.data;

        // Validate repo URL
        const urlValidation = validateGithubRepoUrl(data.repoUrl);
        if (!urlValidation.valid) {
            return c.json({ error: urlValidation.error }, 400);
        }

        // Validate recurring config
        if (data.isRecurring && !data.intervalMs) {
            return c.json({ error: 'intervalMs is required for recurring GitHub jobs (minimum 60000ms / 1 minute)' }, 400);
        }

        // Determine first execution time
        const scheduledAt = data.scheduledAt
            ? new Date(data.scheduledAt)
            : new Date(Date.now() + 5000); // default: 5 seconds from now

        const idempotencyKey = `github-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

        const [newJob] = await db
            .insert(jobs)
            .values({
                userId: user.id,
                name: data.name,
                idempotencyKey,
                scheduledAt,
                toleranceMs: 5000,
                payload: {
                    repoUrl: data.repoUrl,
                    branch: data.branch,
                    buildCommand: data.buildCommand,
                    runCommand: data.runCommand,
                    dockerImage: data.dockerImage,
                    timeoutMs: data.timeoutMs,
                    memoryLimit: data.memoryLimit,
                    cpuLimit: data.cpuLimit,
                    workDir: data.workDir,
                    type: 'GITHUB_EXEC',
                },
                deliveryType: 'GITHUB_EXEC',
                deliveryConfig: {
                    repoUrl: data.repoUrl,
                    branch: data.branch,
                    buildCommand: data.buildCommand,
                    runCommand: data.runCommand,
                    dockerImage: data.dockerImage,
                    timeoutMs: data.timeoutMs,
                    memoryLimit: data.memoryLimit,
                    cpuLimit: data.cpuLimit,
                    envVars: data.envVars,
                    workDir: data.workDir,
                },
                maxRetries: data.maxRetries || 3,
                isRecurring: data.isRecurring || false,
                intervalMs: data.intervalMs || null,
                status: 'SCHEDULED',
            })
            .returning();

        log.info(
            {
                jobId: newJob.id,
                repoUrl: data.repoUrl,
                branch: data.branch,
                runCommand: data.runCommand,
                isRecurring: data.isRecurring,
                intervalMs: data.intervalMs,
            },
            'GitHub execution job created'
        );

        return c.json({
            message: 'GitHub execution job created successfully',
            job: {
                id: newJob.id,
                name: newJob.name,
                status: newJob.status,
                scheduledAt: newJob.scheduledAt,
                isRecurring: newJob.isRecurring,
                intervalMs: newJob.intervalMs,
                deliveryType: newJob.deliveryType,
                deliveryConfig: newJob.deliveryConfig,
                payload: newJob.payload,
                maxRetries: newJob.maxRetries,
                createdAt: newJob.createdAt,
            },
        }, 201);
    } catch (err: any) {
        log.error({ err }, 'Failed to create GitHub job');
        return c.json({ error: err.message }, 500);
    }
});

// ─── GET /api/github-jobs — List all GitHub execution jobs ───

githubJobRoutes.get('/', async (c) => {
    try {
        const user = c.get('user');
        const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
        const offset = parseInt(c.req.query('offset') || '0', 10);

        const githubJobs = await db
            .select()
            .from(jobs)
            .where(
                and(
                    eq(jobs.userId, user.id),
                    eq(jobs.deliveryType, 'GITHUB_EXEC')
                )
            )
            .orderBy(desc(jobs.createdAt))
            .limit(limit)
            .offset(offset);

        const [{ value: total }] = await db
            .select({ value: count() })
            .from(jobs)
            .where(
                and(
                    eq(jobs.userId, user.id),
                    eq(jobs.deliveryType, 'GITHUB_EXEC')
                )
            );

        return c.json({
            jobs: githubJobs.map((j) => ({
                id: j.id,
                name: j.name,
                status: j.status,
                scheduledAt: j.scheduledAt,
                isRecurring: j.isRecurring,
                intervalMs: j.intervalMs,
                deliveryConfig: j.deliveryConfig,
                payload: j.payload,
                retryCount: j.retryCount,
                maxRetries: j.maxRetries,
                executionId: j.executionId,
                startedAt: j.startedAt,
                completedAt: j.completedAt,
                failedAt: j.failedAt,
                errorMessage: j.errorMessage,
                createdAt: j.createdAt,
                updatedAt: j.updatedAt,
            })),
            pagination: {
                total: Number(total),
                limit,
                offset,
                hasMore: offset + limit < Number(total),
            },
        });
    } catch (err: any) {
        log.error({ err }, 'Failed to list GitHub jobs');
        return c.json({ error: err.message }, 500);
    }
});

// ─── GET /api/github-jobs/:id — Get a GitHub job with execution history ───

githubJobRoutes.get('/:id', async (c) => {
    try {
        const user = c.get('user');
        const jobId = c.req.param('id');

        const [job] = await db
            .select()
            .from(jobs)
            .where(
                and(
                    eq(jobs.id, jobId),
                    eq(jobs.userId, user.id),
                    eq(jobs.deliveryType, 'GITHUB_EXEC')
                )
            )
            .limit(1);

        if (!job) {
            return c.json({ error: 'GitHub job not found' }, 404);
        }

        // Get execution history
        const executions = await db
            .select()
            .from(jobExecutions)
            .where(eq(jobExecutions.jobId, jobId))
            .orderBy(desc(jobExecutions.startedAt));

        return c.json({
            job: {
                id: job.id,
                name: job.name,
                status: job.status,
                scheduledAt: job.scheduledAt,
                isRecurring: job.isRecurring,
                intervalMs: job.intervalMs,
                deliveryConfig: job.deliveryConfig,
                payload: job.payload,
                retryCount: job.retryCount,
                maxRetries: job.maxRetries,
                executionId: job.executionId,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                failedAt: job.failedAt,
                errorMessage: job.errorMessage,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
            },
            executions,
        });
    } catch (err: any) {
        log.error({ err }, 'Failed to get GitHub job');
        return c.json({ error: err.message }, 500);
    }
});

// ─── DELETE /api/github-jobs/:id — Cancel a GitHub execution job ───

githubJobRoutes.delete('/:id', async (c) => {
    try {
        const user = c.get('user');
        const jobId = c.req.param('id');

        const [job] = await db
            .select()
            .from(jobs)
            .where(
                and(
                    eq(jobs.id, jobId),
                    eq(jobs.userId, user.id),
                    eq(jobs.deliveryType, 'GITHUB_EXEC')
                )
            );

        if (!job) {
            return c.json({ error: 'GitHub job not found' }, 404);
        }

        // Can only cancel SCHEDULED jobs
        if (!['SCHEDULED', 'QUEUED'].includes(job.status)) {
            return c.json(
                { error: `Cannot cancel job in ${job.status} status. Only SCHEDULED/QUEUED jobs can be cancelled.` },
                409
            );
        }

        await db
            .update(jobs)
            .set({
                status: 'CANCELLED',
                isRecurring: false,
                lockedBy: null,
                lockedAt: null,
            })
            .where(eq(jobs.id, jobId));

        log.info({ jobId }, 'GitHub job cancelled');

        return c.json({ message: 'GitHub execution job cancelled', jobId });
    } catch (err: any) {
        log.error({ err }, 'Failed to cancel GitHub job');
        return c.json({ error: err.message }, 500);
    }
});
