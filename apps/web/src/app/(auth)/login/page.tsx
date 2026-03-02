'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth.service';
import { Package2, Loader2, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
    email: z.string().email('Email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        setError(null);
        setIsLoading(true);
        try {
            const result = await authService.login(data);
            if (result.requireTenantSelection) {
                // Multiple tenants — store and redirect to selection page
                sessionStorage.setItem('tenants', JSON.stringify(result.tenants));
                sessionStorage.setItem('loginEmail', data.email);
                sessionStorage.setItem('loginPassword', data.password);
                router.push('/select-tenant');
                return;
            }
            router.push('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Login gagal. Cek email dan password Anda.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
                        <Package2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">MediStock</h1>
                    <p className="text-slate-400 text-sm mt-1">Medical Inventory Management</p>
                </div>

                {/* Card */}
                <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl">
                    <h2 className="text-xl font-semibold text-white mb-6">Masuk ke Akun</h2>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-4">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                            <input
                                {...register('email')}
                                type="email"
                                placeholder="admin@example.com"
                                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                            />
                            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                            <input
                                {...register('password')}
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                            />
                            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {isLoading ? 'Masuk...' : 'Masuk'}
                        </button>
                    </form>

                    <p className="text-center text-slate-400 text-sm mt-6">
                        Belum punya akun?{' '}
                        <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                            Daftar sekarang
                        </Link>
                    </p>
                </div>

                <p className="text-center text-slate-500 text-xs mt-6">
                    © 2025 MediStock. All rights reserved.
                </p>
            </div>
        </div>
    );
}
