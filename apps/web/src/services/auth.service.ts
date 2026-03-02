import { api, setAuthCookies, clearAuthCookies } from '@/lib/api';
import Cookies from 'js-cookie';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface LoginCredentials {
    email: string;
    password: string;
    tenantId?: string;
}

export interface RegisterData {
    email: string;
    password: string;
    name?: string;
    tenantName: string;
    tenantSlug: string;
}

export interface UserInfo {
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

// ─── Auth Service ─────────────────────────────────────────────────────────────
export const authService = {
    async login(credentials: LoginCredentials) {
        const res = await api.post('/auth/login', credentials);
        const data = res.data.data || res.data;

        if (data.requireTenantSelection) {
            return data; // Return tenant selection list
        }

        setAuthCookies(data.accessToken, data.refreshToken);
        Cookies.set('tenantId', data.tenant.id, { secure: true, sameSite: 'strict' });
        Cookies.set('userInfo', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.role,
            tenant: data.tenant,
        }), { secure: true, sameSite: 'strict' });

        return data;
    },

    async register(data: RegisterData) {
        const res = await api.post('/auth/register', data);
        const result = res.data.data || res.data;

        setAuthCookies(result.accessToken, result.refreshToken);
        Cookies.set('tenantId', result.tenant.id, { secure: true, sameSite: 'strict' });
        Cookies.set('userInfo', JSON.stringify({
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: 'OWNER',
            tenant: result.tenant,
        }), { secure: true, sameSite: 'strict' });

        return result;
    },

    async logout() {
        try {
            await api.post('/auth/logout');
        } finally {
            clearAuthCookies();
        }
    },

    async getProfile(): Promise<UserInfo> {
        const res = await api.get('/auth/profile');
        return res.data.data || res.data;
    },

    getCurrentUser(): UserInfo | null {
        try {
            const info = Cookies.get('userInfo');
            return info ? JSON.parse(info) : null;
        } catch {
            return null;
        }
    },

    isAuthenticated(): boolean {
        return !!Cookies.get('accessToken');
    },
};
