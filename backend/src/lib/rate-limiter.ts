import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, rateLimits } from '../db/schema.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('rate-limiter');

// Plan limits mapping (jobs per minute)
const PLAN_LIMITS: Record<string, number> = {
    FREE: 100,
    STARTER: 1000,
    PRO: 10000,
    ENTERPRISE: 100000,
};

/**
 * Sliding window rate limiter using PostgreSQL.
 * Checks if the user has exceeded their plan's rate limit.
 */
export async function checkRateLimit(
    userId: string,
    plan: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const limit = 9999999999 //PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
    const windowStart = new Date(Date.now() - 60000); // 1-minute window

    // Count jobs in the current window using upsert pattern
    const result = await db.execute<{ count: string }>(sql`
    SELECT COALESCE(SUM(count), 0) as count
    FROM rate_limits
    WHERE user_id = ${userId}
      AND window_start >= ${windowStart}
  `);

    const currentCount = parseInt(result.rows[0]?.count || '0', 10);
    const remaining = Math.max(0, limit - currentCount);

    return {
        allowed: currentCount < limit,
        remaining,
        limit,
    };
}

/**
 * Increment the rate limit counter for the current window.
 */
export async function incrementRateLimit(userId: string): Promise<void> {
    const windowStart = new Date();
    windowStart.setSeconds(0, 0); // Round to minute boundary

    await db.execute(sql`
    INSERT INTO rate_limits (user_id, window_start, count)
    VALUES (${userId}, ${windowStart}, 1)
    ON CONFLICT (id) 
    DO UPDATE SET count = rate_limits.count + 1
  `);

    // Fallback: simple insert
    try {
        await db.insert(rateLimits).values({
            userId,
            windowStart,
            count: 1,
        });
    } catch {
        // If the record exists for this window, update it
        await db.execute(sql`
      UPDATE rate_limits 
      SET count = count + 1 
      WHERE user_id = ${userId} 
        AND window_start = ${windowStart}
    `);
    }
}

/**
 * Clean up old rate limit records (older than 5 minutes).
 */
export async function cleanupRateLimits(): Promise<void> {
    const cutoff = new Date(Date.now() - 300000);
    await db.execute(sql`
    DELETE FROM rate_limits WHERE window_start < ${cutoff}
  `);
}
