import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = [
    {
        ttl: 60000,
        limit: 100,
    },
];

export function corsConfig(origin: string) {
    return {
        origin: origin.split(',').map((o) => o.trim()),
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
        exposedHeaders: ['X-Total-Count'],
        maxAge: 86400,
    };
}
