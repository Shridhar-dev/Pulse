import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config';
import * as schema from './schema';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger('database');

const pool = new pg.Pool({
    connectionString: config.database.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    log.error({ err }, 'Unexpected database pool error');
});

export const db = drizzle(pool, { schema });
export { pool };

export async function healthCheck(): Promise<boolean> {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
    } catch (err) {
        log.error({ err }, 'Database health check failed');
        return false;
    }
}

/**
 * Returns the canonical server time from the database.
 * This is THE source of truth for time across the cluster,
 * eliminating clock-skew issues between scheduler nodes.
 */
export async function getServerTime(): Promise<Date> {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT NOW() as server_time');
        return result.rows[0].server_time;
    } finally {
        client.release();
    }
}
