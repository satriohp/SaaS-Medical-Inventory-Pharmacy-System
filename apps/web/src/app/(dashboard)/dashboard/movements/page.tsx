'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery as useProductQuery } from '@tanstack/react-query';
import { stockMovementService, productService, StockMovement, MovementType } from '@/services/api.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ArrowUpCircle, ArrowDownCircle, RotateCcw, RefreshCw, X, AlertCircle } from 'lucide-react';
import { formatDateTime, formatNumber, cn } from '@/lib/utils';

const movementSchema = z.object({
    productId: z.string().min(1, 'Pilih produk'),
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'EXPIRED']),
    quantity: z.coerce.number().min(1, 'Jumlah minimal 1'),
    batchNumber: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
});
type MovementForm = z.infer<typeof movementSchema>;

const MOVEMENT_META: Record<MovementType, { label: string; color: string; icon: React.ElementType; sign: string }> = {
    IN: { label: 'Masuk', color: 'bg-emerald-100 text-emerald-700', icon: ArrowUpCircle, sign: '+' },
    OUT: { label: 'Keluar', color: 'bg-red-100 text-red-700', icon: ArrowDownCircle, sign: '-' },
    ADJUSTMENT: { label: 'Penyesuaian', color: 'bg-blue-100 text-blue-700', icon: RefreshCw, sign: '±' },
    RETURN: { label: 'Retur', color: 'bg-violet-100 text-violet-700', icon: RotateCcw, sign: '+' },
    EXPIRED: { label: 'Kadaluarsa', color: 'bg-orange-100 text-orange-700', icon: AlertCircle, sign: '-' },
};

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in">
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export default function MovementsPage() {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [filterType, setFilterType] = useState<MovementType | ''>('');
    const [showModal, setShowModal] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['movements', page, filterType],
        queryFn: () => stockMovementService.getAll({ type: filterType || undefined, page, limit: 15 }),
        placeholderData: (prev) => prev,
    });

    const { data: productsData } = useProductQuery({
        queryKey: ['products-all'],
        queryFn: () => productService.getAll({ limit: 100, isActive: true }),
    });

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MovementForm>({
        resolver: zodResolver(movementSchema),
        defaultValues: { type: 'IN', quantity: 1 },
    });

    const createMutation = useMutation({
        mutationFn: stockMovementService.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['movements'] });
            qc.invalidateQueries({ queryKey: ['inventory'] });
            qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setShowModal(false);
            reset();
        },
    });

    const movements: StockMovement[] = data?.items || [];
    const pagination = data?.pagination;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Stock Movement</h2>
                    <p className="text-slate-500 text-sm mt-0.5">Riwayat pergerakan stok (hanya bisa tambah, tidak bisa diedit)</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm">
                    <Plus className="w-4 h-4" /> Catat Pergerakan
                </button>
            </div>

            {/* Type filter */}
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setFilterType(''); setPage(1); }}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        filterType === '' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
                    Semua
                </button>
                {Object.entries(MOVEMENT_META).map(([type, { label, color }]) => (
                    <button key={type} onClick={() => { setFilterType(type as MovementType); setPage(1); }}
                        className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                            filterType === type ? cn(color, 'border-transparent') : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {['Produk', 'Tipe', 'Jumlah', 'Batch', 'Referensi', 'Catatan', 'Waktu'].map((h) => (
                                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}><td colSpan={7} className="px-4 py-3">
                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                    </td></tr>
                                ))
                            ) : movements.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-16 text-slate-400">Belum ada riwayat pergerakan stok.</td></tr>
                            ) : movements.map((m) => {
                                const meta = MOVEMENT_META[m.type];
                                const Icon = meta.icon;
                                return (
                                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-800">{m.product?.name || 'Unknown'}</p>
                                            <p className="text-xs text-slate-400 font-mono">{m.product?.sku}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', meta.color)}>
                                                <Icon className="w-3 h-3" />{meta.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('font-bold', m.type === 'IN' || m.type === 'RETURN' ? 'text-emerald-600' : 'text-red-500')}>
                                                {meta.sign}{formatNumber(m.quantity)}
                                            </span>
                                            <span className="text-slate-400 text-xs ml-1">{m.product?.unit}</span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{m.batchNumber || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{m.reference || '-'}</td>
                                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate">{m.notes || '-'}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
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
                                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
                            <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Catat Pergerakan Stok">
                <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                    {createMutation.error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4" />
                            {(createMutation.error as any)?.response?.data?.message || 'Terjadi kesalahan'}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Produk</label>
                        <select {...register('productId')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Pilih Produk --</option>
                            {productsData?.items.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                        </select>
                        {errors.productId && <p className="text-red-500 text-xs mt-1">{errors.productId.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                            <select {...register('type')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {Object.entries(MOVEMENT_META).map(([t, { label }]) => (
                                    <option key={t} value={t}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah</label>
                            <input {...register('quantity')} type="number" min={1}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">No. Batch</label>
                            <input {...register('batchNumber')} type="text" placeholder="BATCH-001"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Referensi</label>
                            <input {...register('reference')} type="text" placeholder="PO-2025-001"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
                        <textarea {...register('notes')} rows={2} placeholder="Keterangan tambahan..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowModal(false)}
                            className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                        <button type="submit" disabled={isSubmitting || createMutation.isPending}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                            {(isSubmitting || createMutation.isPending) && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            Simpan
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
