import { sql } from 'drizzle-orm';
import { db, pool } from './index.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('migrate');

async function migrate() {
  log.info('Starting database migration...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ─── Create enums ─────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE job_status AS ENUM (
          'SCHEDULED', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD', 'CANCELLED'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE delivery_type AS ENUM ('HTTP', 'WEBHOOK', 'CODE_EXEC', 'GITHUB_EXEC');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Add GITHUB_EXEC to existing enum if not present
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE delivery_type ADD VALUE IF NOT EXISTS 'GITHUB_EXEC';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE pricing_plan AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ─── Create users table ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        api_key VARCHAR(64) NOT NULL UNIQUE,
        plan pricing_plan NOT NULL DEFAULT 'FREE',
        max_jobs_per_minute INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ─── Create jobs table ────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        idempotency_key VARCHAR(255) NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        tolerance_ms INTEGER NOT NULL DEFAULT 500,
        is_recurring BOOLEAN NOT NULL DEFAULT false,
        interval_ms BIGINT,
        name VARCHAR(255) NOT NULL,
        payload JSONB DEFAULT '{}',
        delivery_type delivery_type NOT NULL DEFAULT 'HTTP',
        delivery_config JSONB NOT NULL,
        status job_status NOT NULL DEFAULT 'SCHEDULED',
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 5,
        locked_by VARCHAR(255),
        locked_at TIMESTAMPTZ,
        lock_fencing_token BIGINT,
        execution_id VARCHAR(64),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ─── Create job_executions table ──────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        execution_id VARCHAR(64) NOT NULL,
        fencing_token BIGINT NOT NULL,
        status VARCHAR(32) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        result JSONB,
        error_message TEXT,
        worker_node_id VARCHAR(255)
      );
    `);

    // ─── Create rate_limits table ─────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        window_start TIMESTAMPTZ NOT NULL,
        count INTEGER NOT NULL DEFAULT 0
      );
    `);

    // ─── Create indexes ───────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_poll ON jobs (status, scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_jobs_locked_at ON jobs (locked_by, locked_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency ON jobs (user_id, idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs (user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_executions_unique ON job_executions (job_id, execution_id);
      CREATE INDEX IF NOT EXISTS idx_executions_job_id ON job_executions (job_id);
    `);

    // ─── Create fencing token sequence ────────────────
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS fencing_token_seq START 1;
    `);

    // ─── Create updated_at trigger function ───────────
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
      CREATE TRIGGER update_jobs_updated_at
        BEFORE UPDATE ON jobs
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    log.info('Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    log.error({ err }, 'Migration failed');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  log.error({ err }, 'Fatal migration error');
  process.exit(1);
});
