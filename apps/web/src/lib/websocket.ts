import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

export type InventoryEvent = 'stock.low' | 'stock.critical' | 'stock.threshold';

export interface StockAlertPayload {
    tenantId: string;
    productId: string;
    productName: string;
    productSku: string;
    currentQuantity: number;
    minStock: number;
    event: InventoryEvent;
    message: string;
}

type AlertCallback = (payload: StockAlertPayload) => void;

class WebSocketClient {
    private socket: Socket | null = null;
    private listeners: Map<string, AlertCallback[]> = new Map();

    connect(): void {
        if (this.socket?.connected) return;

        const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
        const tenantId = Cookies.get('tenantId');
        const accessToken = Cookies.get('accessToken');

        if (!tenantId || !accessToken) return;

        this.socket = io(WS_URL, {
            auth: { token: accessToken },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        this.socket.on('connect', () => {
            this.socket?.emit('join', { tenantId });
        });

        this.socket.on('disconnect', () => { });

        this.socket.on('connect_error', () => { });

        (['stock.low', 'stock.critical', 'stock.threshold'] as InventoryEvent[]).forEach((event) => {
            this.socket?.on(event, (payload: StockAlertPayload) => {
                const cbs = this.listeners.get(event) || [];
                cbs.forEach((cb) => cb(payload));
            });
        });
    }

    disconnect(): void {
        this.socket?.disconnect();
        this.socket = null;
    }

    on(event: InventoryEvent, callback: AlertCallback): () => void {
        const existing = this.listeners.get(event) || [];
        this.listeners.set(event, [...existing, callback]);
        return () => {
            const updated = (this.listeners.get(event) || []).filter((cb) => cb !== callback);
            this.listeners.set(event, updated);
        };
    }

    isConnected(): boolean {
        return !!this.socket?.connected;
    }
}

export const wsClient = new WebSocketClient();
