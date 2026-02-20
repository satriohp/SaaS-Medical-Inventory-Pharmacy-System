import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { INVENTORY_EVENTS, StockAlertPayload } from '../inventory/inventory.service';

/**
 * NotificationGateway — WebSocket gateway for real-time inventory alerts.
 * Clients join tenant-specific rooms to receive scoped notifications.
 */
@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    },
    namespace: '/notifications',
})
export class NotificationGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(NotificationGateway.name);

    @WebSocketServer()
    server!: Server;

    handleConnection(client: Socket): void {
        const tenantId = client.handshake.query.tenantId as string;
        if (tenantId) {
            client.join(`tenant-${tenantId}`);
            this.logger.log(`Client connected: ${client.id} → tenant-${tenantId}`);
        } else {
            this.logger.warn(`Client connected without tenantId: ${client.id}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket): void {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @OnEvent(INVENTORY_EVENTS.LOW_STOCK)
    handleLowStock(payload: StockAlertPayload): void {
        this.server.to(`tenant-${payload.tenantId}`).emit('stock:low', {
            type: 'LOW_STOCK',
            message: `Low stock alert: ${payload.productName} (${payload.productSku}) — ${payload.currentQuantity} remaining (min: ${payload.minStock})`,
            data: payload,
            timestamp: new Date().toISOString(),
        });
        this.logger.warn(`Low stock alert emitted for tenant ${payload.tenantId}`);
    }

    @OnEvent(INVENTORY_EVENTS.OUT_OF_STOCK)
    handleOutOfStock(payload: StockAlertPayload): void {
        this.server.to(`tenant-${payload.tenantId}`).emit('stock:out', {
            type: 'OUT_OF_STOCK',
            message: `Out of stock: ${payload.productName} (${payload.productSku})`,
            data: payload,
            timestamp: new Date().toISOString(),
        });
        this.logger.warn(`Out of stock alert emitted for tenant ${payload.tenantId}`);
    }

    @OnEvent(INVENTORY_EVENTS.STOCK_UPDATED)
    handleStockUpdated(payload: StockAlertPayload): void {
        this.server.to(`tenant-${payload.tenantId}`).emit('stock:updated', {
            type: 'STOCK_UPDATED',
            data: payload,
            timestamp: new Date().toISOString(),
        });
    }
}
