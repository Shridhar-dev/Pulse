import { Context, Next } from 'hono';
import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { config } from '../config.js';
import { createChildLogger } from './logger.js';
import type { PulseEnv } from '../types/hono.js';

const log = createChildLogger('auth');

const JWT_SECRET = new TextEncoder().encode(config.api.jwtSecret);

// ─── Password utils ────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// ─── JWT utils ──────────────────────────────────────

export async function generateToken(userId: string, email: string): Promise<string> {
    return new SignJWT({ userId, email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(config.api.jwtExpiry)
        .setIssuer('pulse')
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
    log.info({ tokenPrefix: token.substring(0, 10) }, 'verifyToken invoked');
    // 1. Try generic jose verifier first (Legacy Pulse Auth)
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
            issuer: 'pulse',
        });
        log.info('jwtVerify succeeded');
        return payload as { userId?: string; email?: string; isClerk?: false };
    } catch (err) {
        log.info({ err: (err as Error).message }, 'jwtVerify failed');
       // Proceed to try Clerk decode extraction
    }

    // 2. Try decoding as Clerk token
    try {
        const decoded = decodeJwt(token);
        log.info({ decoded }, 'jose decodeJwt result');
        if (decoded && decoded.sub) {
             // For Clerk, we don't have JWKS validation strictly enforced here yet in dev, 
             // but we extract the subject (Clerk user ID)
             return { userId: decoded.sub, isClerk: true, payload: decoded };
        }
    } catch (err) {
        log.error({ err }, 'decodeJwt error');
        return null;
    }

    return null;
}

// ─── API Key generation ─────────────────────────────

export function generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'pk_';
    for (let i = 0; i < 48; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

// ─── Auth Middleware (JWT Bearer) ───────────────────

export async function authMiddleware(c: Context<PulseEnv>, next: Next) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.slice(7);
    const tokenPayload = await verifyToken(token);

    if (!tokenPayload) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }

    let user;

    if (tokenPayload.userId && !tokenPayload.isClerk) {
        // Find Pulse Native User
        const [found] = await db
            .select()
            .from(users)
            .where(eq(users.id, tokenPayload.userId))
            .limit(1);
        user = found;
    } else if (tokenPayload.isClerk) {
        // Here you would normally map Clerk `sub` to your users table via sync.
        // For development / demo, we fetch the Demo user if sync hasn't happened.
        const [demoUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, 'demo@pulse.dev'))
            .limit(1);
        user = demoUser;
    }

    if (!user) {
        return c.json({ error: 'Assigned User account not found in database' }, 401);
    }

    c.set('user', user);
    c.set('userId', user.id);

    await next();
}

// ─── API Key Middleware ─────────────────────────────

export async function apiKeyMiddleware(c: Context<PulseEnv>, next: Next) {
    const apiKey = c.req.header('X-API-Key');

    if (!apiKey) {
        return c.json({ error: 'Missing X-API-Key header' }, 401);
    }

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.apiKey, apiKey))
        .limit(1);

    if (!user) {
        return c.json({ error: 'Invalid API key' }, 401);
    }

    c.set('user', user);
    c.set('userId', user.id);

    await next();
}

// ─── Combined auth (accepts either JWT or API Key) ──

export async function combinedAuthMiddleware(c: Context<PulseEnv>, next: Next) {
    const apiKey = c.req.header('X-API-Key');
    const authHeader = c.req.header('Authorization');

    if (apiKey) {
        return apiKeyMiddleware(c, next);
    }

    if (authHeader) {
        return authMiddleware(c, next);
    }

    return c.json(
        { error: 'Authentication required. Provide either X-API-Key or Authorization header.' },
        401
    );
}
