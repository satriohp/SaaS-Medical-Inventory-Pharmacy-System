import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Rate limiting configuration
 * Default: 100 requests per 60 seconds per IP
 */
export const throttlerConfig: ThrottlerModuleOptions = [
    {
        ttl: 60000,   // 60 seconds
        limit: 100,   // max requests per window
    },
];

/**
 * CORS configuration factory
 */
export function corsConfig(origin: string) {
    return {
        origin: origin.split(',').map((o) => o.trim()),
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
        exposedHeaders: ['X-Total-Count'],
        maxAge: 86400, // 24 hours
    };
}
