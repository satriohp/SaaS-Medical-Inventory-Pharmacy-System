import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('audit-logs')
@UseGuards(JwtGuard, TenantGuard, RoleGuard)
@Roles(Role.OWNER, Role.ADMIN)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    async getLogs(
        @TenantId() tenantId: string,
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('entity') entity?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.auditService.getLogs(tenantId, {
            userId,
            action,
            entity,
            startDate,
            endDate,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
        });
    }
}
