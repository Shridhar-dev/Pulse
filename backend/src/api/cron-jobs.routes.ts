import { Hono } from 'hono';
import { writeFile, mkdir, readdir, unlink, stat } from 'fs/promises';
import { join, extname } from 'path';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { jobs } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { createChildLogger } from '../lib/logger.js';
import { authMiddleware } from '../lib/auth.js';
import type { PulseEnv } from '../types/hono.js';

const log = createChildLogger('cron-jobs');

// Persistent uploads directory for cron job files
const UPLOADS_DIR = join(process.cwd(), 'uploads', 'cron');

export const cronJobRoutes = new Hono<PulseEnv>();

// Apply auth middleware to all cron-job routes
cronJobRoutes.use('*', authMiddleware);

// ─── POST /api/cron-jobs — Create a new cron job from uploaded file ───

cronJobRoutes.post('/', async (c) => {
    try {
        const body = await c.req.parseBody();
        const codeFile = body['file'] as File;
        const name = body['name'] as string;
        const command = body['command'] as string;
        const intervalMsRaw = body['intervalMs'] as string;
        const scheduledAtRaw = body['scheduledAt'] as string;

        // Validate required fields
        if (!codeFile) return c.json({ error: '"file" is required' }, 400);
        if (!name) return c.json({ error: '"name" is required' }, 400);
        if (!command) return c.json({ error: '"command" is required (e.g. "node {file}")' }, 400);
        if (!intervalMsRaw) return c.json({ error: '"intervalMs" is required (e.g. 60000 for every minute)' }, 400);

        const intervalMs = parseInt(intervalMsRaw, 10);
        if (isNaN(intervalMs) || intervalMs < 1000) {
            return c.json({ error: 'intervalMs must be at least 1000 (1 second)' }, 400);
        }

        if (!command.includes('{file}')) {
            return c.json({ error: 'command must include {file} placeholder (e.g. "node {file}")' }, 400);
        }

        const user = c.get('user');

        // Ensure uploads directory exists
        await mkdir(UPLOADS_DIR, { recursive: true });

        // Generate a unique filename to avoid collisions
        const fileId = crypto.randomUUID();
        const ext = extname(codeFile.name) || '.txt';
        const storedFilename = `${fileId}${ext}`;
        const storedPath = join(UPLOADS_DIR, storedFilename);

        // Save the file permanently
        const buffer = await codeFile.arrayBuffer();
        await writeFile(storedPath, Buffer.from(buffer));

        // Determine first execution time
        const scheduledAt = scheduledAtRaw
            ? new Date(scheduledAtRaw)
            : new Date(Date.now() + 5000); // default: 5 seconds from now

        // Create the recurring job with CODE_EXEC delivery type
        const idempotencyKey = `cron-${fileId}`;

        const [newJob] = await db
            .insert(jobs)
            .values({
                userId: user.id,
                name,
                idempotencyKey,
                scheduledAt,
                toleranceMs: 5000,
                payload: {
                    originalFilename: codeFile.name,
                    fileSize: codeFile.size,
                    storedPath,
                    command,
                    cronJobId: fileId,
                },
                deliveryType: 'CODE_EXEC',
                deliveryConfig: {
                    filePath: storedPath,
                    command,
                },
                maxRetries: 3,
                isRecurring: true,
                intervalMs,
                status: 'SCHEDULED',
            })
            .returning();

        log.info(
            { jobId: newJob.id, fileId, filename: codeFile.name, intervalMs },
            'Cron job created'
        );

        return c.json({
            job: {
                id: newJob.id,
                name: newJob.name,
                status: newJob.status,
                scheduledAt: newJob.scheduledAt,
                isRecurring: newJob.isRecurring,
                intervalMs: newJob.intervalMs,
                deliveryType: newJob.deliveryType,
                payload: newJob.payload,
                createdAt: newJob.createdAt,
            },
            file: {
                id: fileId,
                originalName: codeFile.name,
                storedPath,
                size: codeFile.size,
            },
        }, 201);
    } catch (err: any) {
        log.error({ err }, 'Failed to create cron job');
        return c.json({ error: err.message }, 500);
    }
});

// ─── GET /api/cron-jobs — List all cron jobs (CODE_EXEC recurring) ───

cronJobRoutes.get('/', async (c) => {
    try {
        const user = c.get('user');

        const cronJobs = await db
            .select()
            .from(jobs)
            .where(
                and(
                    eq(jobs.userId, user.id),
                    eq(jobs.deliveryType, 'CODE_EXEC'),
                    eq(jobs.isRecurring, true)
                )
            )
            .orderBy(desc(jobs.createdAt))
            .limit(100);

        return c.json({
            cronJobs: cronJobs.map((j) => ({
                id: j.id,
                name: j.name,
                status: j.status,
                scheduledAt: j.scheduledAt,
                intervalMs: j.intervalMs,
                payload: j.payload,
                deliveryConfig: j.deliveryConfig,
                retryCount: j.retryCount,
                maxRetries: j.maxRetries,
                completedAt: j.completedAt,
                failedAt: j.failedAt,
                errorMessage: j.errorMessage,
                createdAt: j.createdAt,
                updatedAt: j.updatedAt,
            })),
        });
    } catch (err: any) {
        log.error({ err }, 'Failed to list cron jobs');
        return c.json({ error: err.message }, 500);
    }
});

// ─── DELETE /api/cron-jobs/:id — Cancel a cron job and clean up ───

cronJobRoutes.delete('/:id', async (c) => {
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
                    eq(jobs.deliveryType, 'CODE_EXEC')
                )
            );

        if (!job) {
            return c.json({ error: 'Cron job not found' }, 404);
        }

        // Cancel the job
        await db
            .update(jobs)
            .set({
                status: 'CANCELLED',
                isRecurring: false,
                lockedBy: null,
                lockedAt: null,
            })
            .where(eq(jobs.id, jobId));

        // Try to delete the stored file
        const payload = job.payload as any;
        if (payload?.storedPath) {
            try {
                await unlink(payload.storedPath);
                log.info({ storedPath: payload.storedPath }, 'Deleted cron job file');
            } catch {
                log.warn({ storedPath: payload.storedPath }, 'Could not delete cron job file');
            }
        }

        return c.json({ message: 'Cron job cancelled', jobId });
    } catch (err: any) {
        log.error({ err }, 'Failed to cancel cron job');
        return c.json({ error: err.message }, 500);
    }
});
