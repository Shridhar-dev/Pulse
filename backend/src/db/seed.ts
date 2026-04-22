import { db, pool } from './index.js';
import { users, jobs } from './schema.js';
import { hashPassword, generateApiKey } from '../lib/auth.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('seed');

async function seed() {
    log.info('Seeding database...');

    // Create a demo user
    const passwordHash = await hashPassword('demo-password-123');
    const apiKey = generateApiKey();

    const [user] = await db
        .insert(users)
        .values({
            email: 'demo@pulse.dev',
            passwordHash,
            apiKey,
            plan: 'PRO',
            maxJobsPerMinute: 10000,
        })
        .onConflictDoNothing()
        .returning();

    if (user) {
        log.info({ userId: user.id, email: user.email, apiKey }, 'Demo user created');

        // Create some sample jobs
        const sampleJobs = [
            {
                userId: user.id,
                name: 'Send welcome email',
                idempotencyKey: 'welcome-email-1',
                scheduledAt: new Date(Date.now() + 10000),
                payload: { to: 'user@example.com', template: 'welcome' },
                deliveryType: 'HTTP' as const,
                deliveryConfig: {
                    url: 'https://httpbin.org/post',
                    method: 'POST',
                    timeout_ms: 30000,
                },
            },
            {
                userId: user.id,
                name: 'Process payment reminder',
                idempotencyKey: 'payment-reminder-1',
                scheduledAt: new Date(Date.now() + 30000),
                payload: { amount: 99.99, currency: 'USD' },
                deliveryType: 'WEBHOOK' as const,
                deliveryConfig: {
                    url: 'https://httpbin.org/post',
                    method: 'POST',
                    timeout_ms: 15000,
                },
            },
            {
                userId: user.id,
                name: 'Generate daily report',
                idempotencyKey: 'daily-report-1',
                scheduledAt: new Date(Date.now() + 60000),
                payload: { reportType: 'daily', format: 'pdf' },
                deliveryType: 'HTTP' as const,
                deliveryConfig: {
                    url: 'https://httpbin.org/post',
                    method: 'POST',
                    timeout_ms: 60000,
                },
                maxRetries: 3,
            },
        ];

        for (const jobData of sampleJobs) {
            const [job] = await db
                .insert(jobs)
                .values(jobData)
                .onConflictDoNothing()
                .returning();

            if (job) {
                log.info({ jobId: job.id, name: job.name }, 'Sample job created');
            }
        }
    } else {
        log.info('Demo user already exists');
    }

    log.info('Seeding complete!');
    await pool.end();
}

seed().catch((err) => {
    log.error({ err }, 'Seed error');
    process.exit(1);
});
