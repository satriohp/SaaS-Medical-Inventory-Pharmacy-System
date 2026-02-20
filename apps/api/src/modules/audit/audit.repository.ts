import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.AuditLogUncheckedCreateInput) {
        return this.prisma.auditLog.create({ data });
    }

    async findAll(
        tenantId: string,
        options?: {
            userId?: string;
            action?: string;
            entity?: string;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        },
    ) {
        const { userId, action, entity, startDate, endDate, page = 1, limit = 20 } = options || {};

        const where: Prisma.AuditLogWhereInput = {
            tenantId,
            ...(userId && { userId }),
            ...(action && { action: { contains: action, mode: 'insensitive' as const } }),
            ...(entity && { entity: { contains: entity, mode: 'insensitive' as const } }),
            ...(startDate || endDate
                ? {
                    createdAt: {
                        ...(startDate && { gte: startDate }),
                        ...(endDate && { lte: endDate }),
                    },
                }
                : {}),
        };

        const [items, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
