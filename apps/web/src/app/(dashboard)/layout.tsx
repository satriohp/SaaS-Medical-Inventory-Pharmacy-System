'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import {
    LayoutDashboard, Package, Boxes, ArrowRightLeft,
    ClipboardList, LogOut, ChevronRight, Package2, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StockAlertBanner } from '@/components/shared/StockAlertBanner';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/products', label: 'Produk', icon: Package },
    { href: '/dashboard/inventory', label: 'Inventori', icon: Boxes },
    { href: '/dashboard/movements', label: 'Stock Movement', icon: ArrowRightLeft },
    { href: '/dashboard/audit', label: 'Audit Log', icon: ClipboardList },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push('/login');
        }
    }, [router]);

    const user = authService.getCurrentUser();

    const handleLogout = async () => {
        await authService.logout();
        router.push('/login');
    };

    return (
        <>
            <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col border-r border-slate-700/50 shadow-xl">
                    {/* Logo */}
                    <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-600/40">
                                <Package2 className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-white text-lg">MediStock</span>
                        </div>
                    </div>

                    {/* Tenant badge */}
                    {user?.tenant && (
                        <div className="px-4 pt-4 pb-2">
                            <div className="bg-slate-800/80 rounded-lg px-3 py-2">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Tenant</p>
                                <p className="text-sm text-white font-semibold truncate mt-0.5">{user.tenant.name}</p>
                                <span className="inline-block text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full mt-1">{user.role}</span>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
                        {navItems.map(({ href, label, icon: Icon }) => {
                            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50',
                                    )}
                                >
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <span>{label}</span>
                                    {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-70" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User footer */}
                    <div className="p-3 border-t border-slate-700/50">
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-700/50 transition-all">
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-blue-400">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-slate-400 hover:text-red-400 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Topbar */}
                    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
                        <h1 className="text-lg font-semibold text-slate-800">
                            {navItems.find((n) => pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href)))?.label || 'Dashboard'}
                        </h1>
                        <div className="flex items-center gap-3">
                            <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                                <Bell className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                    </header>

                    {/* Page content */}
                    <div className="flex-1 overflow-auto scrollbar-thin p-6 bg-slate-50">
                        {children}
                    </div>
                </main>
            </div>
            {/* Real-time stock alerts - WebSocket powered */}
            <StockAlertBanner />
        </>
    );
}
