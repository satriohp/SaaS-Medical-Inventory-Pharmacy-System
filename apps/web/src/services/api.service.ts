import { api } from '@/lib/api';

export interface Product {
    id: string;
    name: string;
    sku: string;
    category: string | null;
    unit: string;
    description: string | null;
    minStock: number;
    isActive: boolean;
    totalStock?: number;
    isLowStock?: boolean;
    inventoryItems?: Array<{ quantity: number; batchNumber: string | null; expiryDate: string | null }>;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const productService = {
    async getAll(params?: {
        search?: string;
        category?: string;
        isActive?: boolean;
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<Product>> {
        const res = await api.get('/products', { params });
        return res.data.data || res.data;
    },

    async getById(id: string): Promise<Product> {
        const res = await api.get(`/products/${id}`);
        return res.data.data || res.data;
    },

    async create(data: Partial<Product>): Promise<Product> {
        const res = await api.post('/products', data);
        return res.data.data || res.data;
    },

    async update(id: string, data: Partial<Product>): Promise<Product> {
        const res = await api.patch(`/products/${id}`, data);
        return res.data.data || res.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/products/${id}`);
    },
};

export interface InventoryItem {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    category: string | null;
    unit: string;
    quantity: number;
    minStock: number;
    isLowStock: boolean;
    batchNumber: string | null;
    expiryDate: string | null;
    updatedAt: string;
}

export interface DashboardStats {
    totalProducts: number;
    totalStockQuantity: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringWithin30Days: number;
}

export const inventoryService = {
    async getSummary(params?: {
        search?: string;
        lowStockOnly?: boolean;
        page?: number;
        limit?: number;
    }) {
        const res = await api.get('/inventory', { params });
        return res.data.data || res.data;
    },

    async getDashboardStats(): Promise<DashboardStats> {
        const res = await api.get('/inventory/dashboard');
        return res.data.data || res.data;
    },
};

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'EXPIRED';

export interface StockMovement {
    id: string;
    productId: string;
    product: { id: string; name: string; sku: string; unit: string };
    type: MovementType;
    quantity: number;
    batchNumber: string | null;
    expiryDate: string | null;
    reference: string | null;
    notes: string | null;
    performedBy: string;
    createdAt: string;
}

export const stockMovementService = {
    async getAll(params?: {
        productId?: string;
        type?: MovementType;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<StockMovement>> {
        const res = await api.get('/stock-movements', { params });
        return res.data.data || res.data;
    },

    async create(data: {
        productId: string;
        type: MovementType;
        quantity: number;
        batchNumber?: string;
        expiryDate?: string;
        reference?: string;
        notes?: string;
    }) {
        const res = await api.post('/stock-movements', data);
        return res.data.data || res.data;
    },
};

export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    entity: string;
    entityId: string | null;
    after: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: string;
}

export const auditService = {
    async getLogs(params?: {
        page?: number;
        limit?: number;
        startDate?: string;
        endDate?: string;
    }): Promise<PaginatedResponse<AuditLog>> {
        const res = await api.get('/audit-logs', { params });
        return res.data.data || res.data;
    },
};
