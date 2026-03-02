'use client';

import { useQuery } from '@tanstack/react-query';
import { inventoryService, DashboardStats } from '@/services/api.service';

export const inventoryKeys = {
    all: ['inventory'] as const,
    summary: (params?: Record<string, unknown>) => [...inventoryKeys.all, 'summary', params] as const,
    dashboard: () => [...inventoryKeys.all, 'dashboard'] as const,
};

export function useInventorySummary(params?: {
    search?: string;
    lowStockOnly?: boolean;
    page?: number;
    limit?: number;
}) {
    return useQuery({
        queryKey: inventoryKeys.summary(params),
        queryFn: () => inventoryService.getSummary(params),
        placeholderData: (prev) => prev,
        refetchInterval: 30000, // auto-refresh every 30s
    });
}

export function useDashboardStats() {
    return useQuery<DashboardStats>({
        queryKey: inventoryKeys.dashboard(),
        queryFn: () => inventoryService.getDashboardStats(),
        refetchInterval: 30000,
    });
}
