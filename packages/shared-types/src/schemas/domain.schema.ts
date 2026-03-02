import { z } from 'zod';

// ─── Product Schemas ──────────────────────────────────────────────────────────
export const createProductSchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(200),
    sku: z.string().min(1, 'SKU wajib diisi').max(50).toUpperCase(),
    category: z.string().max(100).optional(),
    unit: z.string().min(1, 'Satuan wajib diisi').max(50),
    description: z.string().max(1000).optional(),
    minStock: z.coerce.number().int().min(0).default(10),
});

export const updateProductSchema = createProductSchema.partial();

// ─── Inventory Schemas ────────────────────────────────────────────────────────
export const inventoryQuerySchema = z.object({
    search: z.string().optional(),
    lowStockOnly: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Stock Movement Schemas ───────────────────────────────────────────────────
export const movementTypeEnum = z.enum(['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'EXPIRED']);

export const createMovementSchema = z.object({
    productId: z.string().cuid('Product ID tidak valid'),
    type: movementTypeEnum,
    quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
    batchNumber: z.string().max(100).optional(),
    expiryDate: z.string().datetime().optional(),
    reference: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
});

// ─── Tenant Schemas ───────────────────────────────────────────────────────────
export const updateTenantSchema = z.object({
    name: z.string().min(2).max(100).optional(),
});

export const inviteMemberSchema = z.object({
    email: z.string().email('Email tidak valid'),
    role: z.enum(['ADMIN', 'PHARMACIST', 'STAFF']).default('STAFF'),
});

// ─── Product DTOs ─────────────────────────────────────────────────────────────
export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type MovementType = z.infer<typeof movementTypeEnum>;
export type CreateMovementDto = z.infer<typeof createMovementSchema>;
export type UpdateTenantDto = z.infer<typeof updateTenantSchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;

// ─── Common Types ─────────────────────────────────────────────────────────────
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: PaginationMeta;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T;
    message?: string;
    timestamp: string;
}
