import {
    Controller,
    Get,
    Patch,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { TenantService, UpdateTenantDto, AddMemberDto } from './tenant.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateTenantSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    slug: z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
        .optional(),
});

const addMemberSchema = z.object({
    email: z.string().email(),
    role: z.nativeEnum(Role),
});

const updateRoleSchema = z.object({
    role: z.nativeEnum(Role),
});

@Controller('tenants')
@UseGuards(JwtGuard, TenantGuard)
export class TenantController {
    constructor(private readonly tenantService: TenantService) { }

    @Get()
    async getTenantInfo(@TenantId() tenantId: string) {
        return this.tenantService.getTenantInfo(tenantId);
    }

    @Patch()
    @UseGuards(RoleGuard)
    @Roles(Role.OWNER, Role.ADMIN)
    async updateTenant(
        @TenantId() tenantId: string,
        @Body(new ZodValidationPipe(updateTenantSchema)) dto: UpdateTenantDto,
    ) {
        return this.tenantService.updateTenant(tenantId, dto);
    }

    @Get('members')
    async getMembers(@TenantId() tenantId: string) {
        return this.tenantService.getMembers(tenantId);
    }

    @Post('members')
    @UseGuards(RoleGuard)
    @Roles(Role.OWNER, Role.ADMIN)
    async addMember(
        @TenantId() tenantId: string,
        @Body(new ZodValidationPipe(addMemberSchema)) dto: AddMemberDto,
    ) {
        return this.tenantService.addMember(tenantId, dto);
    }

    @Patch('members/:userId/role')
    @UseGuards(RoleGuard)
    @Roles(Role.OWNER, Role.ADMIN)
    async updateMemberRole(
        @TenantId() tenantId: string,
        @Param('userId') targetUserId: string,
        @CurrentUser('sub') requestingUserId: string,
        @Body(new ZodValidationPipe(updateRoleSchema)) body: { role: Role },
    ) {
        return this.tenantService.updateMemberRole(tenantId, targetUserId, body.role, requestingUserId);
    }

    @Delete('members/:userId')
    @UseGuards(RoleGuard)
    @Roles(Role.OWNER, Role.ADMIN)
    async removeMember(
        @TenantId() tenantId: string,
        @Param('userId') targetUserId: string,
        @CurrentUser('sub') requestingUserId: string,
    ) {
        return this.tenantService.removeMember(tenantId, targetUserId, requestingUserId);
    }
}
