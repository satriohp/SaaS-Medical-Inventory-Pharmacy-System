import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MovementType, Prisma } from '@prisma/client';

@Injectable()
export class StockMovementRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(
        tenantId: string,
        options?: {
            productId?: string;
            type?: MovementType;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        },
    ) {
        const { productId, type, startDate, endDate, page = 1, limit = 20 } = options || {};

        const where: Prisma.StockMovementWhereInput = {
            tenantId,
            ...(productId && { productId }),
            ...(type && { type }),
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
            this.prisma.stockMovement.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            unit: true,
                        },
                    },
                },
            }),
            this.prisma.stockMovement.count({ where }),
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
        return this.prisma.stockMovement.findFirst({
            where: { id, tenantId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        unit: true,
                        category: true,
                    },
                },
            },
        });
    }

    /**
     * Create a stock movement record — IMMUTABLE. No update or delete.
     */
    async create(data: {
        tenantId: string;
        productId: string;
        type: MovementType;
        quantity: number;
        batchNumber?: string;
        expiryDate?: Date;
        reference?: string;
        notes?: string;
        performedBy: string;
    }) {
        return this.prisma.stockMovement.create({
            data,
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        unit: true,
                    },
                },
            },
        });
    }
}
