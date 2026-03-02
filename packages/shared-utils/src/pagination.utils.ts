/**
 * Pagination utility functions — no framework dependency
 */

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginationResult {
    page: number;
    limit: number;
    skip: number;
    take: number;
}

/**
 * Compute skip/take from page/limit for Prisma queries
 */
export function toSkipTake(params: PaginationParams = {}): PaginationResult {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    return { page, limit, skip: (page - 1) * limit, take: limit };
}

/**
 * Build a pagination meta object from total count
 */
export function buildPaginationMeta(total: number, page: number, limit: number) {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}

/**
 * Format large numbers (e.g., 1000 → "1.000")
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format currency in IDR (e.g., 15000 → "Rp 15.000")
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
}
