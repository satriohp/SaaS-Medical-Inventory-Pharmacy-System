import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryRepository } from './inventory.repository';

export const INVENTORY_EVENTS = {
    LOW_STOCK: 'inventory.low_stock',
    OUT_OF_STOCK: 'inventory.out_of_stock',
    STOCK_UPDATED: 'inventory.stock_updated',
} as const;

export interface StockAlertPayload {
    tenantId: string;
    productId: string;
    productName: string;
    productSku: string;
    currentQuantity: number;
    minStock: number;
}

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        private readonly inventoryRepository: InventoryRepository,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async getInventorySummary(
        tenantId: string,
        options?: { search?: string; lowStockOnly?: boolean; page?: number; limit?: number },
    ) {
        return this.inventoryRepository.getInventorySummary(tenantId, options);
    }

    async getDashboardStats(tenantId: string) {
        return this.inventoryRepository.getDashboardStats(tenantId);
    }

    async updateStock(
        tenantId: string,
        productId: string,
        quantityChange: number,
        batchNumber?: string | null,
        expiryDate?: Date | null,
    ) {
        const inventory = await this.inventoryRepository.findOrCreateDefault(tenantId);

        const updatedItem = await this.inventoryRepository.upsertInventoryItem(
            inventory.id,
            productId,
            quantityChange,
            batchNumber,
            expiryDate,
        );

        if (updatedItem.product) {
            const payload: StockAlertPayload = {
                tenantId,
                productId,
                productName: updatedItem.product.name,
                productSku: updatedItem.product.sku,
                currentQuantity: updatedItem.quantity,
                minStock: updatedItem.product.minStock,
            };

            if (updatedItem.quantity <= 0) {
                this.eventEmitter.emit(INVENTORY_EVENTS.OUT_OF_STOCK, payload);
                this.logger.warn(`OUT OF STOCK: ${updatedItem.product.name} | Tenant: ${tenantId}`);
            } else if (updatedItem.quantity < updatedItem.product.minStock) {
                this.eventEmitter.emit(INVENTORY_EVENTS.LOW_STOCK, payload);
                this.logger.warn(`LOW STOCK: ${updatedItem.product.name} = ${updatedItem.quantity} | Tenant: ${tenantId}`);
            }

            this.eventEmitter.emit(INVENTORY_EVENTS.STOCK_UPDATED, payload);
        }

        return updatedItem;
    }
}
