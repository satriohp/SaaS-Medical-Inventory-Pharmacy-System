import { z } from 'zod';

/**
 * Validated environment schema — fail fast if env vars are missing or invalid
 */
const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),

    // JWT
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
    JWT_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    // Application
    PORT: z.string().default('3001').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate and return typed environment config.
 * Throws immediately on startup if any env var is invalid.
 */
export function validateEnv(): EnvConfig {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const errors = parsed.error.issues
            .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
        throw new Error(`❌ Environment validation failed:\n${errors}`);
    }
    return parsed.data;
}
