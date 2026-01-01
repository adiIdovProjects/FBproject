'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import DevAuth from './DevAuth';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // With data that doesn't change often, 5 minutes is a good default
                staleTime: 5 * 60 * 1000,
                // Refetch on window focus for dashboard-like apps is usually good, 
                // but can be annoying if data changes too fast. Leaving default (true).
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <DevAuth />
            {children}
        </QueryClientProvider>
    );
}
