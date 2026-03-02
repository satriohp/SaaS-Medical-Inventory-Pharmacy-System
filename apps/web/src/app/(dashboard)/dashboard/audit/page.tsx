'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditService, AuditLog } from '@/services/api.service';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const METHOD_COLOR: Record<string, string> = {
    POST: 'bg-emerald-100 text-emerald-700',
    PATCH: 'bg-blue-100 text-blue-700',
    PUT: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
};

export default function AuditPage() {
    const [page, setPage] = useState(1);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['audit-logs', page],
        queryFn: () => auditService.getLogs({ page, limit: 20 }),
        placeholderData: (prev) => prev,
    });

    const logs: AuditLog[] = data?.items || [];
    const pagination = data?.pagination;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Audit Log</h2>
                    <p className="text-slate-500 text-sm mt-0.5">Riwayat semua aksi sistem (read-only)</p>
                </div>
                <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {['Waktu', 'Aksi', 'Entity', 'Entity ID', 'IP Address'].map((h) => (
                                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}><td colSpan={5} className="px-4 py-3">
                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                    </td></tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-16 text-slate-400">
                                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p>Belum ada log audit.</p>
                                </td></tr>
                            ) : logs.map((log) => {
                                const method = log.action.split(' ')[0];
                                const methodColor = METHOD_COLOR[method] || 'bg-slate-100 text-slate-600';
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${methodColor}`}>{method}</span>
                                                <span className="text-slate-600 text-xs font-mono truncate max-w-[200px]">{log.action.split(' ').slice(1).join(' ')}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 capitalize text-xs font-medium">{log.entity}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate max-w-[120px]">{log.entityId || '-'}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs font-mono">{log.ipAddress || '-'}</td>
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
        </div>
    );
}
