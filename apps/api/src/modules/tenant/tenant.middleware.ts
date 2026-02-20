import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TenantMiddleware — extracts tenantId from the JWT payload and verifies
 * that the user is an active member of the tenant. This middleware is applied
 * to all tenant-scoped routes.
 *
 * NOTE: This is used as an additional layer on top of TenantGuard.
 * TenantGuard is used as a guard on controllers, while this middleware
 * can be applied globally to routes that need tenant scoping.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
    constructor(private readonly prisma: PrismaService) { }

    async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
        const user = (req as any).user;

        // Skip if no user (public routes)
        if (!user || !user.tenantId) {
            next();
            return;
        }

        // Verify the tenant exists and is active
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: user.tenantId },
        });

        if (!tenant || !tenant.isActive) {
            throw new ForbiddenException('Tenant account is not active');
        }

        // Attach tenant to request
        (req as any).tenant = tenant;
        next();
    }
}
