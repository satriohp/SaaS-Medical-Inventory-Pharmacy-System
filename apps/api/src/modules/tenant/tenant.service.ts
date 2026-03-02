import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { TenantRepository } from './tenant.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

export interface UpdateTenantDto {
    name?: string;
    slug?: string;
}

export interface AddMemberDto {
    email: string;
    role: Role;
}

@Injectable()
export class TenantService {
    private readonly logger = new Logger(TenantService.name);

    constructor(
        private readonly tenantRepository: TenantRepository,
        private readonly prisma: PrismaService,
    ) { }

    async getTenantInfo(tenantId: string) {
        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
            stats: {
                totalMembers: tenant.users.length,
                totalProducts: (tenant as any)._count?.products ?? 0,
                totalMovements: (tenant as any)._count?.movements ?? 0,
            },
        };
    }

    async updateTenant(tenantId: string, dto: UpdateTenantDto) {
        if (dto.slug) {
            const existing = await this.tenantRepository.findBySlug(dto.slug);
            if (existing && existing.id !== tenantId) {
                throw new ConflictException('Slug already in use by another tenant');
            }
        }

        const updated = await this.tenantRepository.update(tenantId, dto);
        this.logger.log(`Tenant updated: ${tenantId}`);
        return updated;
    }

    async getMembers(tenantId: string) {
        return this.tenantRepository.getMembers(tenantId);
    }

    async addMember(tenantId: string, dto: AddMemberDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

        if (!user) {
            throw new NotFoundException(`User with email ${dto.email} not found. They must register first.`);
        }

        const existing = await this.tenantRepository.findMembership(tenantId, user.id);
        if (existing && existing.isActive) {
            throw new ConflictException('User is already a member of this tenant');
        }

        if (existing && !existing.isActive) {
            return this.prisma.tenantUser.update({
                where: { id: existing.id },
                data: { isActive: true, role: dto.role },
            });
        }

        const membership = await this.tenantRepository.addMember(tenantId, user.id, dto.role);
        this.logger.log(`Member added: ${dto.email} → Tenant ${tenantId} as ${dto.role}`);
        return membership;
    }

    async updateMemberRole(tenantId: string, targetUserId: string, role: Role, requestingUserId: string) {
        if (targetUserId === requestingUserId) {
            throw new ForbiddenException('Cannot change your own role');
        }

        const membership = await this.tenantRepository.findMembership(tenantId, targetUserId);
        if (!membership) {
            throw new NotFoundException('Member not found in this tenant');
        }

        return this.tenantRepository.updateMemberRole(tenantId, targetUserId, role);
    }

    async removeMember(tenantId: string, targetUserId: string, requestingUserId: string) {
        if (targetUserId === requestingUserId) {
            throw new ForbiddenException('Cannot remove yourself from the tenant');
        }

        const membership = await this.tenantRepository.findMembership(tenantId, targetUserId);
        if (!membership) {
            throw new NotFoundException('Member not found in this tenant');
        }

        if (membership.role === Role.OWNER) {
            throw new ForbiddenException('Cannot remove the tenant owner');
        }

        await this.tenantRepository.removeMember(tenantId, targetUserId);
        this.logger.log(`Member removed: ${targetUserId} from Tenant ${tenantId}`);
        return { message: 'Member removed successfully' };
    }
}
