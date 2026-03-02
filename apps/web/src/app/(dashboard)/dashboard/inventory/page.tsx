'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryService, InventoryItem } from '@/services/api.service';
import { Search, Boxes, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatNumber, formatDate, cn } from '@/lib/utils';

export default function InventoryPage() {
    const [search, setSearch] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [page, setPage] = useState(1);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['inventory', search, lowStockOnly, page],
        queryFn: () => inventoryService.getSummary({ search: search || undefined, lowStockOnly, page, limit: 15 }),
        placeholderData: (prev) => prev,
    });

    const items: InventoryItem[] = data?.items || [];
    const pagination = data?.pagination;

    const getStockStatus = (item: InventoryItem) => {
        if (item.quantity <= 0) return { label: 'Habis', color: 'bg-red-100 text-red-700' };
        if (item.isLowStock) return { label: 'Menipis', color: 'bg-amber-100 text-amber-700' };
        return { label: 'Normal', color: 'bg-emerald-100 text-emerald-700' };
    };

    const isExpiringSoon = (expiryDate: string | null) => {
        if (!expiryDate) return false;
        const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days <= 30 && days >= 0;
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Manajemen Inventori</h2>
                <p className="text-slate-500 text-sm mt-0.5">{pagination?.total ?? 0} item dalam inventori</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Cari produk..."
                        value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <button
                    onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
                    className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                        lowStockOnly ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600',
                    )}>
                    <AlertTriangle className="w-4 h-4" />
                    {lowStockOnly ? 'Semua Item' : 'Stok Menipis'}
                </button>
                <button onClick={() => refetch()} className="p-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-all">
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {['Produk', 'SKU', 'Kategori', 'Batch', 'Qty', 'Min Stok', 'Expiry', 'Status'].map((h) => (
                                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}><td colSpan={8} className="px-4 py-3">
                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                    </td></tr>
                                ))
                            ) : items.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-16 text-slate-400">
                                    <Boxes className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p>Tidak ada item inventori.</p>
                                </td></tr>
                            ) : items.map((item) => {
                                const status = getStockStatus(item);
                                const expiringSoon = isExpiringSoon(item.expiryDate);
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-800">{item.productName}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.productSku}</td>
                                        <td className="px-4 py-3 text-slate-500">{item.category || '-'}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.batchNumber || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn('font-bold text-base', item.quantity <= 0 ? 'text-red-600' : item.isLowStock ? 'text-amber-600' : 'text-emerald-600')}>
                                                {formatNumber(item.quantity)}
                                            </span>
                                            <span className="text-slate-400 text-xs ml-1">{item.unit}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{formatNumber(item.minStock)}</td>
                                        <td className="px-4 py-3">
                                            {item.expiryDate ? (
                                                <span className={cn('text-xs', expiringSoon ? 'text-red-600 font-semibold' : 'text-slate-600')}>
                                                    {expiringSoon && '⚠️ '}{formatDate(item.expiryDate)}
                                                </span>
                                            ) : <span className="text-slate-400 text-xs">-</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', status.color)}>
                                                {status.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500">Halaman {page} dari {pagination.totalPages}</p>
                        <div className="flex gap-2">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">← Prev</button>
                            <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next →</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
