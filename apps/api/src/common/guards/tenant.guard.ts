import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.tenantId) {
            throw new ForbiddenException('Tenant context is missing');
        }

        const membership = await this.prisma.tenantUser.findUnique({
            where: {
                userId_tenantId: {
                    userId: user.sub,
                    tenantId: user.tenantId,
                },
            },
        });

        if (!membership || !membership.isActive) {
            throw new ForbiddenException('You are not an active member of this tenant');
        }

        const tenant = await this.prisma.tenant.findUnique({
            where: { id: user.tenantId },
        });

        if (!tenant || !tenant.isActive) {
            throw new ForbiddenException('This tenant account is inactive');
        }

        request.tenantUser = membership;

        return true;
    }
}
