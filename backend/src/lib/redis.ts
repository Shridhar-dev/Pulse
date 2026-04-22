import Redis from 'ioredis';
import { config } from '../config.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('redis');

export const redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        log.info({ times }, "Retrying Redis connection...");
        // Retry indefinitely with a max delay of 5000ms
        return Math.min(times * 500, 5000);
    },
    lazyConnect: true,
});

redis.on('error', (err) => {
    log.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
    log.info('Redis connected');
});

/**
 * Distributed Lock using Redis with fencing tokens.
 *
 * This implements a simple but effective distributed lock:
 * 1. SET NX with TTL for mutual exclusion
 * 2. Fencing token (monotonically increasing) to detect stale locks
 * 3. Lua script for atomic release (only if we still hold the lock)
 */
export class DistributedLock {
    private readonly redis: Redis;
    private readonly keyPrefix = 'pulse:lock:';

    constructor(redisClient: Redis) {
        this.redis = redisClient;
    }

    /**
     * Acquire a lock on a resource.
     * Returns the fencing token if acquired, null if lock is held by another.
     */
    async acquire(
        resourceId: string,
        ownerId: string,
        ttlMs: number
    ): Promise<{ acquired: boolean; fencingToken: number | null }> {
        const key = this.keyPrefix + resourceId;
        const fencingTokenKey = 'pulse:fencing:' + resourceId;

        // Atomically: increment fencing token + set lock if not exists
        const luaScript = `
      local lockKey = KEYS[1]
      local fencingKey = KEYS[2]
      local owner = ARGV[1]
      local ttl = tonumber(ARGV[2])
      
      -- Try to acquire the lock
      local acquired = redis.call('SET', lockKey, owner, 'NX', 'PX', ttl)
      if acquired then
        -- Increment and return fencing token
        local token = redis.call('INCR', fencingKey)
        return token
      else
        return -1
      end
    `;

        const result = await this.redis.eval(
            luaScript,
            2,
            key,
            fencingTokenKey,
            ownerId,
            ttlMs.toString()
        ) as number;

        if (result === -1) {
            return { acquired: false, fencingToken: null };
        }

        return { acquired: true, fencingToken: result };
    }

    /**
     * Release a lock. Only the current owner can release.
     * Uses Lua script for atomic check-and-delete.
     */
    async release(resourceId: string, ownerId: string): Promise<boolean> {
        const key = this.keyPrefix + resourceId;

        const luaScript = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else
        return 0
      end
    `;

        const result = await this.redis.eval(luaScript, 1, key, ownerId) as number;
        return result === 1;
    }

    /**
     * Extend a lock's TTL. Only the current owner can extend.
     */
    async extend(resourceId: string, ownerId: string, ttlMs: number): Promise<boolean> {
        const key = this.keyPrefix + resourceId;

        const luaScript = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('PEXPIRE', KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

        const result = await this.redis.eval(
            luaScript,
            1,
            key,
            ownerId,
            ttlMs.toString()
        ) as number;
        return result === 1;
    }

    /**
     * Check if a lock is currently held.
     */
    async isLocked(resourceId: string): Promise<boolean> {
        const key = this.keyPrefix + resourceId;
        const result = await this.redis.exists(key);
        return result === 1;
    }
}

export const distributedLock = new DistributedLock(redis);
