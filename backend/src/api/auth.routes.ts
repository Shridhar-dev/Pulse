import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import {
    hashPassword,
    verifyPassword,
    generateToken,
    generateApiKey,
    authMiddleware,
} from '../lib/auth.js';
import { createChildLogger } from '../lib/logger.js';
import type { PulseEnv } from '../types/hono.js';

const log = createChildLogger('auth-routes');

export const authRoutes = new Hono<PulseEnv>();

// ─── Validation Schemas ─────────────────────────────

const signUpSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const signInSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// ─── POST /auth/signup ──────────────────────────────

authRoutes.post('/signup', async (c) => {
    try {
        const body = await c.req.json();
        const parsed = signUpSchema.safeParse(body);

        if (!parsed.success) {
            return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
        }

        const { email, password } = parsed.data;

        // Check if user already exists
        const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existing) {
            return c.json({ error: 'Email already registered' }, 409);
        }

        const passwordHash = await hashPassword(password);
        const apiKey = generateApiKey();

        const [newUser] = await db
            .insert(users)
            .values({
                email,
                passwordHash,
                apiKey,
                plan: 'FREE',
                maxJobsPerMinute: 100,
            })
            .returning();

        const token = await generateToken(newUser.id, newUser.email);

        log.info({ userId: newUser.id, email }, 'User registered');

        return c.json(
            {
                message: 'Account created successfully',
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    plan: newUser.plan,
                    apiKey: newUser.apiKey,
                },
                token,
            },
            201
        );
    } catch (err) {
        log.error({ err }, 'Signup error');
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ─── POST /auth/signin ─────────────────────────────

authRoutes.post('/signin', async (c) => {
    try {
        const body = await c.req.json();
        const parsed = signInSchema.safeParse(body);

        if (!parsed.success) {
            return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
        }

        const { email, password } = parsed.data;

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (!user) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        const token = await generateToken(user.id, user.email);

        log.info({ userId: user.id }, 'User signed in');

        return c.json({
            message: 'Signed in successfully',
            user: {
                id: user.id,
                email: user.email,
                plan: user.plan,
                apiKey: user.apiKey,
            },
            token,
        });
    } catch (err) {
        log.error({ err }, 'Signin error');
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ─── POST /auth/refresh-api-key ─────────────────────

authRoutes.post('/refresh-api-key', authMiddleware, async (c) => {
    try {
        const userId = c.get('userId');
        const newApiKey = generateApiKey();

        const [updated] = await db
            .update(users)
            .set({ apiKey: newApiKey })
            .where(eq(users.id, userId))
            .returning();

        log.info({ userId }, 'API key refreshed');

        return c.json({
            message: 'API key refreshed',
            apiKey: updated.apiKey,
        });
    } catch (err) {
        log.error({ err }, 'API key refresh error');
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ─── GET /auth/me ───────────────────────────────────

authRoutes.get('/me', authMiddleware, async (c) => {
    const user = c.get('user');
    return c.json({
        id: user.id,
        email: user.email,
        plan: user.plan,
        apiKey: user.apiKey,
        maxJobsPerMinute: user.maxJobsPerMinute,
        createdAt: user.createdAt,
    });
});
