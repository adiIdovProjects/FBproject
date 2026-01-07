'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { AccountSelector } from '@/components/connect/AccountSelector';
import { fetchAvailableAccounts, linkAccounts, AdAccount } from '@/services/accounts.service';

export default function SelectAccountsPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<AdAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check URL params for token from OAuth callback (Facebook login flow)
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const tokenFromUrl = searchParams.get('token');

            if (tokenFromUrl) {
                console.log('[Select Accounts] Token received from OAuth callback');
                // Store token from OAuth callback
                localStorage.setItem('token', tokenFromUrl);
                // Also set as cookie for redundancy
                document.cookie = `token=${tokenFromUrl}; path=/; max-age=86400; SameSite=Lax`;
                // Clean URL (remove query params)
                window.history.replaceState({}, '', window.location.pathname);
            }
        }

        // Small delay to ensure token is stored before making API call
        const timer = setTimeout(() => {
            loadAccounts();
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    const loadAccounts = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Check if user has auth token
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                router.push('/en/login');
                return;
            }

            // Fetch available accounts from Facebook
            const availableAccounts = await fetchAvailableAccounts();
            setAccounts(availableAccounts);
        } catch (err: any) {
            console.error('Error loading accounts:', err);
            setError(err.message || 'Failed to load Facebook ad accounts. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLinkAccounts = async (selectedAccounts: AdAccount[]) => {
        try {
            // Link selected accounts
            const response = await linkAccounts(selectedAccounts);

            // Show success message briefly
            console.log(`Successfully linked ${response.linked_count} accounts`);

            // Redirect to quiz page where user can answer questions while data syncs
            router.push('/en/quiz');
        } catch (err: any) {
            console.error('Error linking accounts:', err);
            setError(err.message || 'Failed to link accounts. Please try again.');
        }
    };

    const handleRetry = () => {
        loadAccounts();
    };

    return (
        <div className="min-h-screen bg-[#0F1115] py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-white mb-4">
                        Link Your Ad Accounts
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Select the Facebook ad accounts you want to track and analyze
                    </p>
                </div>

                {/* Main Content */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-red-200 font-medium">Error</p>
                                <p className="text-red-300/80 text-sm mt-1">{error}</p>
                            </div>
                            <button
                                onClick={handleRetry}
                                className="text-sm px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    <AccountSelector
                        accounts={accounts}
                        onLink={handleLinkAccounts}
                        isLoading={isLoading}
                    />
                </div>

                {/* Footer Help Text */}
                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm">
                        Don't see your accounts?{' '}
                        <button
                            onClick={() => router.push('/en/connect')}
                            className="text-accent hover:text-accent/80 underline"
                        >
                            Reconnect your Facebook account
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
