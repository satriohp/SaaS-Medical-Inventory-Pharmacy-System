'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockMovementService, MovementType } from '@/services/api.service';
import { inventoryKeys } from '../inventory/hooks/useInventory';

export const movementKeys = {
    all: ['movements'] as const,
    list: (params?: Record<string, unknown>) => [...movementKeys.all, 'list', params] as const,
};

export function useStockMovements(params?: {
    productId?: string;
    type?: MovementType;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}) {
    return useQuery({
        queryKey: movementKeys.list(params),
        queryFn: () => stockMovementService.getAll(params),
        placeholderData: (prev) => prev,
    });
}

export function useCreateMovement() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: stockMovementService.create,
        onSuccess: () => {
            // Invalidate movements, inventory, and dashboard stats on new movement
            qc.invalidateQueries({ queryKey: movementKeys.all });
            qc.invalidateQueries({ queryKey: inventoryKeys.all });
        },
    });
}
