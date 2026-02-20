import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @TenantId() — extracts the tenant ID from the JWT payload.
 * Usage: @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        return request.user?.tenantId;
    },
);
