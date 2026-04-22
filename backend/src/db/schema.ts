import {
    pgTable,
    varchar,
    text,
    timestamp,
    integer,
    jsonb,
    uuid,
    boolean,
    bigint,
    index,
    uniqueIndex,
    pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ──────────────────────────────────────────

export const jobStatusEnum = pgEnum('job_status', [
    'SCHEDULED',
    'QUEUED',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'DEAD',       // exhausted all retries
    'CANCELLED',
]);

export const deliveryTypeEnum = pgEnum('delivery_type', [
    'HTTP',
    'WEBHOOK',
    'CODE_EXEC',
    'GITHUB_EXEC',
]);

export const pricingPlanEnum = pgEnum('pricing_plan', [
    'FREE',
    'STARTER',
    'PRO',
    'ENTERPRISE',
]);

// ─── Users ──────────────────────────────────────────

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    apiKey: varchar('api_key', { length: 64 }).notNull().unique(),
    plan: pricingPlanEnum('plan').notNull().default('FREE'),
    maxJobsPerMinute: integer('max_jobs_per_minute').notNull().default(100),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Jobs ───────────────────────────────────────────

export const jobs = pgTable(
    'jobs',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),

        // Idempotency: user-provided key to prevent duplicate job creation
        idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),

        // Scheduling
        scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
        toleranceMs: integer('tolerance_ms').notNull().default(500),

        // Recurring jobs
        isRecurring: boolean('is_recurring').notNull().default(false),
        intervalMs: bigint('interval_ms', { mode: 'number' }),  // null = one-time job

        // Job definition
        name: varchar('name', { length: 255 }).notNull(),
        payload: jsonb('payload').$type<Record<string, unknown>>().default({}),

        // Delivery configuration
        deliveryType: deliveryTypeEnum('delivery_type').notNull().default('HTTP'),
        deliveryConfig: jsonb('delivery_config').$type<{
            url?: string;
            method?: string;
            headers?: Record<string, string>;
            topic?: string;
            timeout_ms?: number;
            // CODE_EXEC fields
            filePath?: string;
            command?: string;
            // GITHUB_EXEC fields
            repoUrl?: string;
            branch?: string;
            buildCommand?: string;
            runCommand?: string;
            dockerImage?: string;
            timeoutMs?: number;
            memoryLimit?: string;
            cpuLimit?: string;
            envVars?: Record<string, string>;
            workDir?: string;
        }>().notNull(),

        // Status tracking
        status: jobStatusEnum('status').notNull().default('SCHEDULED'),
        retryCount: integer('retry_count').notNull().default(0),
        maxRetries: integer('max_retries').notNull().default(5),

        // Lock management
        lockedBy: varchar('locked_by', { length: 255 }),
        lockedAt: timestamp('locked_at', { withTimezone: true }),
        lockFencingToken: bigint('lock_fencing_token', { mode: 'number' }),

        // Execution tracking
        executionId: varchar('execution_id', { length: 64 }),
        startedAt: timestamp('started_at', { withTimezone: true }),
        completedAt: timestamp('completed_at', { withTimezone: true }),
        failedAt: timestamp('failed_at', { withTimezone: true }),
        errorMessage: text('error_message'),

        // Metadata
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        // Index for scheduler polling: find SCHEDULED jobs due now
        scheduledAtStatusIdx: index('idx_jobs_scheduled_poll').on(
            table.status,
            table.scheduledAt
        ),
        // Index for lock timeout recovery
        lockedAtIdx: index('idx_jobs_locked_at').on(table.lockedBy, table.lockedAt),
        // Idempotency: unique per user
        idempotencyIdx: uniqueIndex('idx_jobs_idempotency').on(
            table.userId,
            table.idempotencyKey
        ),
        // User lookup
        userIdIdx: index('idx_jobs_user_id').on(table.userId),
        // Status filtering
        statusIdx: index('idx_jobs_status').on(table.status),
    })
);

// ─── Job Execution Log (audit trail for exactly-once) ──

export const jobExecutions = pgTable(
    'job_executions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        jobId: uuid('job_id')
            .notNull()
            .references(() => jobs.id, { onDelete: 'cascade' }),
        executionId: varchar('execution_id', { length: 64 }).notNull(),
        fencingToken: bigint('fencing_token', { mode: 'number' }).notNull(),
        status: varchar('status', { length: 32 }).notNull(),
        startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
        completedAt: timestamp('completed_at', { withTimezone: true }),
        result: jsonb('result').$type<Record<string, unknown>>(),
        errorMessage: text('error_message'),
        workerNodeId: varchar('worker_node_id', { length: 255 }),
    },
    (table) => ({
        // Unique execution ID per job — prevents duplicate execution records
        executionUniqueIdx: uniqueIndex('idx_executions_unique').on(
            table.jobId,
            table.executionId
        ),
        jobIdIdx: index('idx_executions_job_id').on(table.jobId),
    })
);

// ─── Rate Limit Tracking ────────────────────────────

export const rateLimits = pgTable('rate_limits', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
});

// ─── Type exports ───────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobExecution = typeof jobExecutions.$inferSelect;
export type NewJobExecution = typeof jobExecutions.$inferInsert;
