'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30 * 1000, // 30 seconds
                        retry: (failureCount, error: any) => {
                            // Don't retry on 401/403
                            if (error?.response?.status === 401 || error?.response?.status === 403) return false;
                            return failureCount < 2;
                        },
                    },
                    mutations: {
                        onError: (error: any) => {
                            console.error('Mutation error:', error?.response?.data?.message || error.message);
                        },
                    },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
