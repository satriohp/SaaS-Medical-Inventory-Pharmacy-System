/**
 * Pure date utilities — no framework dependency
 */

/**
 * Format a date to Indonesian locale (e.g., "5 Mar 2025")
 */
export function formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(date));
}

/**
 * Format a date + time (e.g., "5 Mar 2025, 14:30")
 */
export function formatDateTime(date: Date | string): string {
    return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

/**
 * Return days until a date from now (negative = already expired)
 */
export function daysUntil(date: Date | string): number {
    return Math.floor((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is within N days from now
 */
export function isExpiringSoon(date: Date | string | null, withinDays = 30): boolean {
    if (!date) return false;
    const days = daysUntil(date);
    return days >= 0 && days <= withinDays;
}

/**
 * Check if date is in the past
 */
export function isExpired(date: Date | string | null): boolean {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
}
