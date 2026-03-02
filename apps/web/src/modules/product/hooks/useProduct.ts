'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, Product } from '@/services/api.service';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const productKeys = {
    all: ['products'] as const,
    list: (params?: Record<string, unknown>) => [...productKeys.all, 'list', params] as const,
    detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useProducts(params?: { search?: string; category?: string; isActive?: boolean; page?: number; limit?: number }) {
    return useQuery({
        queryKey: productKeys.list(params),
        queryFn: () => productService.getAll(params),
        placeholderData: (prev) => prev,
    });
}

export function useProduct(id: string) {
    return useQuery({
        queryKey: productKeys.detail(id),
        queryFn: () => productService.getById(id),
        enabled: !!id,
    });
}

export function useCreateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: productService.create,
        onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
    });
}

export function useUpdateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => productService.update(id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
    });
}

export function useDeleteProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: productService.delete,
        onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
    });
}
