import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: false,
});

// ─── Request interceptor: attach access token ───────────────────────────────
api.interceptors.request.use((config) => {
    const token = Cookies.get('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Response interceptor: handle 401 → refresh token ──────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token!);
    });
    failedQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = Cookies.get('refreshToken');
            if (!refreshToken) {
                clearAuthCookies();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                const { accessToken, refreshToken: newRefreshToken } = res.data.data;

                setAuthCookies(accessToken, newRefreshToken);
                processQueue(null, accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearAuthCookies();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

// ─── Cookie helpers ──────────────────────────────────────────────────────────
export function setAuthCookies(accessToken: string, refreshToken: string) {
    Cookies.set('accessToken', accessToken, { secure: true, sameSite: 'strict', expires: 1 / 96 }); // 15 min
    Cookies.set('refreshToken', refreshToken, { secure: true, sameSite: 'strict', expires: 7 });
}

export function clearAuthCookies() {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('tenantId');
    Cookies.remove('userInfo');
}

export function getAuthCookies() {
    return {
        accessToken: Cookies.get('accessToken'),
        refreshToken: Cookies.get('refreshToken'),
        tenantId: Cookies.get('tenantId'),
    };
}
