'use client';

import { useQuery } from '@tanstack/react-query';
import { inventoryService, DashboardStats } from '@/services/api.service';
import { Package, Boxes, AlertTriangle, TrendingDown, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

function StatCard({
    label, value, icon: Icon, color, subtitle,
}: {
    label: string; value: number | string; icon: React.ElementType;
    color: 'blue' | 'green' | 'amber' | 'red'; subtitle?: string;
}) {
    const colors = {
        blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', value: 'text-blue-700' },
        green: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-700' },
        amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', value: 'text-amber-700' },
        red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', value: 'text-red-700' },
    };
    const c = colors[color];
    return (
        <div className={`${c.bg} rounded-xl p-5 border border-white shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
                    <p className={`text-3xl font-bold ${c.value}`}>{typeof value === 'number' ? formatNumber(value) : value}</p>
                    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`${c.icon} rounded-xl p-3`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { data: stats, isLoading, error, refetch } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: () => inventoryService.getDashboardStats(),
        refetchInterval: 30000, // auto-refresh every 30s
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-slate-500 text-sm">Memuat dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                    <p className="text-slate-600">Gagal memuat data. <button onClick={() => refetch()} className="text-blue-500 underline">Coba lagi</button></p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Selamat Datang 👋</h2>
                <p className="text-slate-500 text-sm mt-1">Berikut ringkasan inventori klinik Anda hari ini</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Produk" value={stats?.totalProducts ?? 0}
                    icon={Package} color="blue" subtitle="Produk aktif terdaftar"
                />
                <StatCard
                    label="Total Stok" value={stats?.totalStockQuantity ?? 0}
                    icon={Boxes} color="green" subtitle="Unit dalam inventori"
                />
                <StatCard
                    label="Stok Menipis" value={stats?.lowStockCount ?? 0}
                    icon={TrendingDown} color="amber" subtitle="Di bawah batas minimum"
                />
                <StatCard
                    label="Stok Habis" value={stats?.outOfStockCount ?? 0}
                    icon={AlertTriangle} color="red" subtitle="Perlu segera diisi"
                />
            </div>

            {/* Expiry alert */}
            {stats && stats.expiringWithin30Days > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-amber-800">Perhatian: Produk Mendekati Expiry</p>
                        <p className="text-sm text-amber-700">
                            <strong>{formatNumber(stats.expiringWithin30Days)}</strong> item akan kadaluarsa dalam 30 hari ke depan.
                        </p>
                    </div>
                    <a href="/dashboard/inventory" className="ml-auto text-sm font-medium text-amber-700 hover:text-amber-900 underline whitespace-nowrap">
                        Lihat sekarang →
                    </a>
                </div>
            )}

            {/* Quick links */}
            <div>
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Aksi Cepat</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'Tambah Produk Baru', href: '/dashboard/products', icon: Package, color: 'blue' },
                        { label: 'Catat Stok Masuk', href: '/dashboard/movements', icon: ArrowRightLeft, color: 'green' },
                        { label: 'Lihat Inventori', href: '/dashboard/inventory', icon: Boxes, color: 'purple' },
                    ].map(({ label, href, icon: Icon, color }) => (
                        <a key={href} href={href}
                            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                                <Icon className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">{label}</span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
