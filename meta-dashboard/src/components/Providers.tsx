'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { AccountProvider } from '@/context/AccountContext';
import { UserProvider } from '@/context/UserContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AIChatProvider } from '@/context/AIChatContext';
import { ToastProvider } from '@/context/ToastContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import ChatWidget from '@/components/chat/ChatWidget';
import CookieConsent from '@/components/CookieConsent';

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
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <UserProvider>
                        <AccountProvider>
                            <AIChatProvider>
                                <ToastProvider>
                                    {children}
                                    <ChatWidget />
                                    <CookieConsent />
                                </ToastProvider>
                            </AIChatProvider>
                        </AccountProvider>
                    </UserProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
