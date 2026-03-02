import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface StockThresholdEvent {
    tenantId: string;
    productId: string;
    productName: string;
    productSku: string;
    currentQuantity: number;
    minStock: number;
}

export interface StockUpdatedEvent {
    tenantId: string;
    productId: string;
    newQuantity: number;
    movementType: string;
}

@Injectable()
export class InventoryEventsService {
    constructor(private readonly eventEmitter: EventEmitter2) { }

    checkAndEmitThreshold(payload: StockThresholdEvent): void {
        const { currentQuantity, minStock } = payload;

        if (currentQuantity <= 0) {
            this.eventEmitter.emit('stock.critical', payload);
            this.eventEmitter.emit('stock.threshold', { ...payload, level: 'critical' });
        } else if (currentQuantity < minStock) {
            this.eventEmitter.emit('stock.low', payload);
            this.eventEmitter.emit('stock.threshold', { ...payload, level: 'low' });
        }
    }

    emitStockUpdated(payload: StockUpdatedEvent): void {
        this.eventEmitter.emit('stock.updated', payload);
    }
}
