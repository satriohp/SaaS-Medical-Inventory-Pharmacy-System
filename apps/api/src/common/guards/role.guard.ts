import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const tenantUser = request.tenantUser;

        if (!tenantUser) {
            throw new ForbiddenException('Tenant membership not found');
        }

        const hasRole = requiredRoles.includes(tenantUser.role);
        if (!hasRole) {
            throw new ForbiddenException(
                `Insufficient permissions. Required: ${requiredRoles.join(', ')}`,
            );
        }

        return true;
    }
}
