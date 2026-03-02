'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth.service';
import { Package2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const registerSchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.string().email('Email tidak valid'),
    password: z.string()
        .min(8, 'Password minimal 8 karakter')
        .regex(/[A-Z]/, 'Harus ada huruf kapital')
        .regex(/[0-9]/, 'Harus ada angka'),
    tenantName: z.string().min(2, 'Nama klinik minimal 2 karakter').max(100),
    tenantSlug: z.string()
        .min(2, 'Slug minimal 2 karakter')
        .max(50)
        .regex(/^[a-z0-9-]+$/, 'Hanya huruf kecil, angka, dan tanda strip'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const password = watch('password', '');
    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
    };

    const onSubmit = async (data: RegisterForm) => {
        setError(null);
        setIsLoading(true);
        try {
            await authService.register(data);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Registrasi gagal. Coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 py-8">
            <div className="w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
                        <Package2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">MediStock</h1>
                    <p className="text-slate-400 text-sm mt-1">Daftar & mulai kelola inventori Anda</p>
                </div>

                <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl">
                    <h2 className="text-xl font-semibold text-white mb-6">Buat Akun Baru</h2>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-4">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama Lengkap</label>
                            <input {...register('name')} type="text" placeholder="dr. Budi Santoso"
                                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm" />
                            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                            <input {...register('email')} type="email" placeholder="admin@klinik.com"
                                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm" />
                            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                            <input {...register('password')} type="password" placeholder="••••••••"
                                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm" />
                            {password && (
                                <div className="mt-2 space-y-1">
                                    {[{ ok: passwordChecks.length, label: 'Minimal 8 karakter' },
                                    { ok: passwordChecks.uppercase, label: 'Ada huruf kapital' },
                                    { ok: passwordChecks.number, label: 'Ada angka' }].map(({ ok, label }) => (
                                        <div key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-400' : 'text-slate-500'}`}>
                                            <CheckCircle2 className="w-3 h-3" />{label}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <div className="pt-2 border-t border-slate-700">
                            <p className="text-xs text-slate-400 mb-3">Info Fasilitas Kesehatan</p>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama Klinik / Apotek</label>
                                    <input {...register('tenantName')} type="text" placeholder="Klinik Sehat Bersama"
                                        className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm" />
                                    {errors.tenantName && <p className="text-red-400 text-xs mt-1">{errors.tenantName.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Slug (URL unik)</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 text-sm">medistock.app/</span>
                                        <input {...register('tenantSlug')} type="text" placeholder="klinik-sehat"
                                            className="flex-1 px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm" />
                                    </div>
                                    {errors.tenantSlug && <p className="text-red-400 text-xs mt-1">{errors.tenantSlug.message}</p>}
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading}
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 mt-2">
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isLoading ? 'Mendaftar...' : 'Daftar Sekarang'}
                        </button>
                    </form>

                    <p className="text-center text-slate-400 text-sm mt-6">
                        Sudah punya akun?{' '}
                        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Masuk di sini</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
