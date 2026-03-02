'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, Product } from '@/services/api.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Pencil, Trash2, Package, RefreshCw, X, AlertCircle } from 'lucide-react';
import { formatDate, formatNumber, cn } from '@/lib/utils';

const productSchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    sku: z.string().min(1, 'SKU wajib diisi').toUpperCase(),
    category: z.string().optional(),
    unit: z.string().min(1, 'Satuan wajib diisi'),
    description: z.string().optional(),
    minStock: z.coerce.number().min(0, 'Min stok tidak boleh negatif'),
});
type ProductForm = z.infer<typeof productSchema>;

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export default function ProductsPage() {
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['products', search, page],
        queryFn: () => productService.getAll({ search: search || undefined, page, limit: 10 }),
        placeholderData: (prev) => prev,
    });

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductForm>({
        resolver: zodResolver(productSchema),
        defaultValues: { minStock: 0 },
    });

    const createMutation = useMutation({
        mutationFn: productService.create,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setModalMode(null); reset(); },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => productService.update(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setModalMode(null); reset(); },
    });

    const deleteMutation = useMutation({
        mutationFn: productService.delete,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setDeleteId(null); },
    });

    const onSubmit = (form: ProductForm) => {
        if (modalMode === 'edit' && editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const openEdit = (p: Product) => {
        setEditingProduct(p);
        reset({ name: p.name, sku: p.sku, category: p.category || '', unit: p.unit, description: p.description || '', minStock: p.minStock });
        setModalMode('edit');
    };

    const openCreate = () => {
        setEditingProduct(null);
        reset({ name: '', sku: '', category: '', unit: 'tablet', description: '', minStock: 0 });
        setModalMode('create');
    };

    const products = data?.items || [];
    const pagination = data?.pagination;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Manajemen Produk</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{pagination?.total ?? 0} produk terdaftar</p>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md">
                    <Plus className="w-4 h-4" /> Tambah Produk
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Cari nama atau SKU produk..."
                    value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {['Nama Produk', 'SKU', 'Kategori', 'Satuan', 'Min Stok', 'Stok Saat Ini', 'Status', 'Aksi'].map((h) => (
                                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}><td colSpan={8} className="px-4 py-3">
                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                    </td></tr>
                                ))
                            ) : products.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-16 text-slate-400">
                                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p>Belum ada produk. Tambah produk pertama Anda.</p>
                                </td></tr>
                            ) : products.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-600 bg-slate-50">{p.sku}</td>
                                    <td className="px-4 py-3 text-slate-600">{p.category || '-'}</td>
                                    <td className="px-4 py-3 text-slate-600">{p.unit}</td>
                                    <td className="px-4 py-3 text-slate-600">{formatNumber(p.minStock)}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('font-semibold', (p.totalStock ?? 0) <= p.minStock ? 'text-red-600' : 'text-emerald-600')}>
                                            {formatNumber(p.totalStock ?? 0)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                                            {p.isActive ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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

            {/* Create/Edit Modal */}
            <Modal isOpen={!!modalMode} onClose={() => setModalMode(null)} title={modalMode === 'edit' ? 'Edit Produk' : 'Tambah Produk Baru'}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {(createMutation.error || updateMutation.error) && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4" />
                            {(createMutation.error as any)?.response?.data?.message || 'Terjadi kesalahan'}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { name: 'name' as const, label: 'Nama Produk', placeholder: 'Paracetamol 500mg', colSpan: 2 },
                            { name: 'sku' as const, label: 'SKU', placeholder: 'PCT-500' },
                            { name: 'category' as const, label: 'Kategori', placeholder: 'Analgesic' },
                            { name: 'unit' as const, label: 'Satuan', placeholder: 'tablet' },
                            { name: 'minStock' as const, label: 'Min. Stok', placeholder: '50', type: 'number' },
                        ].map(({ name, label, placeholder, colSpan, type }) => (
                            <div key={name} className={colSpan === 2 ? 'col-span-2' : ''}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                                <input {...register(name)} type={type || 'text'} placeholder={placeholder}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message}</p>}
                            </div>
                        ))}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                            <textarea {...register('description')} rows={2} placeholder="Keterangan produk (opsional)"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setModalMode(null)}
                            className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                        <button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                            {(isSubmitting || createMutation.isPending || updateMutation.isPending) && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            {modalMode === 'edit' ? 'Simpan Perubahan' : 'Tambah Produk'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete confirmation */}
            <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Produk">
                <div className="space-y-4">
                    <p className="text-slate-600 text-sm">Yakin ingin menghapus produk ini? Produk tidak akan muncul di inventori namun data historis tetap tersimpan.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteId(null)}
                            className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                        <button onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-60">
                            {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
