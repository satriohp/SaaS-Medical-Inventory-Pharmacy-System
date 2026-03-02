import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    constructor(private readonly prisma: PrismaService) { }

    async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
        const user = (req as any).user;

        if (!user || !user.tenantId) {
            next();
            return;
        }

        const tenant = await this.prisma.tenant.findUnique({
            where: { id: user.tenantId },
        });

        if (!tenant || !tenant.isActive) {
            throw new ForbiddenException('Tenant account is not active');
        }

        (req as any).tenant = tenant;
        next();
    }
}
