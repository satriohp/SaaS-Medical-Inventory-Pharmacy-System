import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(
        tenantId: string,
        options?: {
            search?: string;
            category?: string;
            isActive?: boolean;
            page?: number;
            limit?: number;
        },
    ) {
        const { search, category, isActive, page = 1, limit = 20 } = options || {};

        const where: Prisma.ProductWhereInput = {
            tenantId,
            ...(isActive !== undefined && { isActive }),
            ...(category && { category }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { sku: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    inventoryItems: {
                        select: {
                            quantity: true,
                            batchNumber: true,
                            expiryDate: true,
                        },
                    },
                },
            }),
            this.prisma.product.count({ where }),
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

    async findById(tenantId: string, id: string) {
        return this.prisma.product.findFirst({
            where: { id, tenantId },
            include: {
                inventoryItems: {
                    select: {
                        id: true,
                        quantity: true,
                        batchNumber: true,
                        expiryDate: true,
                        updatedAt: true,
                    },
                },
                movements: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        type: true,
                        quantity: true,
                        reference: true,
                        createdAt: true,
                    },
                },
            },
        });
    }

    async findBySku(tenantId: string, sku: string) {
        return this.prisma.product.findUnique({
            where: { tenantId_sku: { tenantId, sku } },
        });
    }

    async create(data: Prisma.ProductCreateInput) {
        return this.prisma.product.create({ data });
    }

    async update(tenantId: string, id: string, data: Prisma.ProductUpdateInput) {
        return this.prisma.product.updateMany({
            where: { id, tenantId },
            data,
        });
    }

    async softDelete(tenantId: string, id: string) {
        return this.prisma.product.updateMany({
            where: { id, tenantId },
            data: { isActive: false },
        });
    }
}
