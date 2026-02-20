import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findDefaultInventory(tenantId: string) {
        return this.prisma.inventory.findFirst({
            where: { tenantId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async findOrCreateDefault(tenantId: string) {
        let inventory = await this.findDefaultInventory(tenantId);
        if (!inventory) {
            inventory = await this.prisma.inventory.create({
                data: {
                    tenantId,
                    name: 'Main Warehouse',
                },
            });
        }
        return inventory;
    }

    async getInventorySummary(tenantId: string, options?: { search?: string; lowStockOnly?: boolean; page?: number; limit?: number }) {
        const { search, lowStockOnly, page = 1, limit = 20 } = options || {};

        const inventory = await this.findOrCreateDefault(tenantId);

        // Build WHERE condition to join with product for filtering
        const whereCondition: any = {
            inventoryId: inventory.id,
        };

        if (search) {
            whereCondition.product = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { sku: { contains: search, mode: 'insensitive' as const } },
                ],
            };
        }

        const [items, total] = await Promise.all([
            this.prisma.inventoryItem.findMany({
                where: whereCondition,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            category: true,
                            unit: true,
                            minStock: true,
                            isActive: true,
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
            }),
            this.prisma.inventoryItem.count({ where: whereCondition }),
        ]);

        // Filter low stock items if requested
        let filteredItems = items;
        if (lowStockOnly) {
            filteredItems = items.filter(
                (item) => item.quantity < item.product.minStock,
            );
        }

        return {
            inventoryId: inventory.id,
            inventoryName: inventory.name,
            items: filteredItems.map((item) => ({
                id: item.id,
                productId: item.productId,
                productName: item.product.name,
                productSku: item.product.sku,
                category: item.product.category,
                unit: item.product.unit,
                quantity: item.quantity,
                minStock: item.product.minStock,
                isLowStock: item.quantity < item.product.minStock,
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate,
                updatedAt: item.updatedAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findInventoryItem(inventoryId: string, productId: string, batchNumber?: string | null) {
        return this.prisma.inventoryItem.findFirst({
            where: {
                inventoryId,
                productId,
                batchNumber: batchNumber || null,
            },
        });
    }

    async upsertInventoryItem(
        inventoryId: string,
        productId: string,
        quantityChange: number,
        batchNumber?: string | null,
        expiryDate?: Date | null,
    ) {
        const existing = await this.findInventoryItem(inventoryId, productId, batchNumber);

        if (existing) {
            return this.prisma.inventoryItem.update({
                where: { id: existing.id },
                data: {
                    quantity: existing.quantity + quantityChange,
                    expiryDate: expiryDate ?? existing.expiryDate,
                },
                include: { product: true },
            });
        }

        return this.prisma.inventoryItem.create({
            data: {
                inventoryId,
                productId,
                quantity: quantityChange,
                batchNumber: batchNumber || null,
                expiryDate: expiryDate || null,
            },
            include: { product: true },
        });
    }

    async getDashboardStats(tenantId: string) {
        const inventory = await this.findOrCreateDefault(tenantId);

        const [totalProducts, totalItems, lowStockItems, expiringItems] = await Promise.all([
            this.prisma.product.count({ where: { tenantId, isActive: true } }),
            this.prisma.inventoryItem.aggregate({
                where: { inventoryId: inventory.id },
                _sum: { quantity: true },
            }),
            // Count low stock items (compare quantity vs product.minStock in app layer)
            this.prisma.inventoryItem.findMany({
                where: { inventoryId: inventory.id },
                include: { product: { select: { minStock: true } } },
            }),
            // Items expiring within 30 days
            this.prisma.inventoryItem.count({
                where: {
                    inventoryId: inventory.id,
                    expiryDate: {
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        gte: new Date(),
                    },
                },
            }),
        ]);

        const lowStockCount = lowStockItems.filter(
            (item) => item.quantity < item.product.minStock && item.quantity > 0,
        ).length;

        const outOfStockCount = lowStockItems.filter(
            (item) => item.quantity <= 0,
        ).length;

        return {
            totalProducts,
            totalStockQuantity: totalItems._sum.quantity || 0,
            lowStockCount,
            outOfStockCount,
            expiringWithin30Days: expiringItems,
        };
    }
}
