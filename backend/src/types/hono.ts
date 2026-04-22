import type { User } from '../db/schema.js';

/**
 * Hono environment type declarations for Pulse.
 * This extends Hono's context with typed variables.
 */
export type PulseEnv = {
    Variables: {
        user: User;
        userId: string;
    };
};
