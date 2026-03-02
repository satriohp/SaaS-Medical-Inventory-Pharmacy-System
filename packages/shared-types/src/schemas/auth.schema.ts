import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
    email: z.string().email('Email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
    tenantId: z.string().optional(),
});

export const registerSchema = z.object({
    email: z.string().email('Email tidak valid'),
    password: z
        .string()
        .min(8, 'Password minimal 8 karakter')
        .regex(/[A-Z]/, 'Harus ada huruf kapital')
        .regex(/[0-9]/, 'Harus ada angka'),
    name: z.string().min(2).max(100).optional(),
    tenantName: z.string().min(2, 'Nama tenant minimal 2 karakter').max(100),
    tenantSlug: z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-z0-9-]+$/, 'Hanya huruf kecil, angka, dan tanda strip'),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
});

// ─── Auth DTOs ────────────────────────────────────────────────────────────────
export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    tenant: {
        id: string;
        name: string;
        slug: string;
        plan: string;
    } | null;
}
