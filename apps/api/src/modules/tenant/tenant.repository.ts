import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class TenantRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string) {
        return this.prisma.tenant.findUnique({
            where: { id },
            include: {
                users: {
                    include: { user: true },
                    where: { isActive: true },
                },
                _count: {
                    select: {
                        products: true,
                        movements: true,
                    },
                },
            },
        });
    }

    async findBySlug(slug: string) {
        return this.prisma.tenant.findUnique({
            where: { slug },
        });
    }

    async update(id: string, data: Prisma.TenantUpdateInput) {
        return this.prisma.tenant.update({
            where: { id },
            data,
        });
    }

    async getMembers(tenantId: string) {
        return this.prisma.tenantUser.findMany({
            where: { tenantId, isActive: true },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async addMember(tenantId: string, userId: string, role: Role) {
        return this.prisma.tenantUser.create({
            data: { tenantId, userId, role },
            include: { user: true },
        });
    }

    async updateMemberRole(tenantId: string, userId: string, role: Role) {
        return this.prisma.tenantUser.update({
            where: { userId_tenantId: { userId, tenantId } },
            data: { role },
        });
    }

    async removeMember(tenantId: string, userId: string) {
        return this.prisma.tenantUser.update({
            where: { userId_tenantId: { userId, tenantId } },
            data: { isActive: false },
        });
    }

    async findMembership(tenantId: string, userId: string) {
        return this.prisma.tenantUser.findUnique({
            where: { userId_tenantId: { userId, tenantId } },
        });
    }
}
