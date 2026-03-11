import { z } from 'zod';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001').transform(Number),
    JWT_SECRET: z.string().optional(),
    JWT_EXPIRY: z.string().default('8h'),
    JWT_REFRESH_EXPIRY: z.string().default('24h'),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
    DATABRICKS_CLIENT_ID: z.string().optional(),
    DATABRICKS_CLIENT_SECRET: z.string().optional(),
    DATABRICKS_HOST: z.string().optional(),
    CSRF_ENABLED: z.string().default('true').transform(val => val !== 'false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('[BFF Config] ❌ Invalid environment variables:', parsed.error.format());
    process.exit(1);
}

const config = parsed.data;

// Generate or validate JWT Secret dynamically for fallback
let effectiveJwtSecret = config.JWT_SECRET;
if (!effectiveJwtSecret) {
    if (config.NODE_ENV === 'production') {
        console.error('[BFF Config] ❌ FATAL: JWT_SECRET must be set in production environment');
        process.exit(1);
    }
    effectiveJwtSecret = crypto.randomBytes(64).toString('hex');
    console.warn('[BFF Config] ⚠️  No JWT_SECRET env var set. Generated a per-boot secret. Set JWT_SECRET in server/.env for persistence across restarts.');
}

export const env = {
    ...config,
    effectiveJwtSecret
};
