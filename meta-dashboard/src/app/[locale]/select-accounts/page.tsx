'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, AlertCircle } from 'lucide-react';
import { AccountSelector } from '@/components/connect/AccountSelector';
import { fetchAvailableAccounts, linkAccounts, AdAccount } from '@/services/accounts.service';
import { apiClient } from '@/services/apiClient';

export default function SelectAccountsPage() {
    const router = useRouter();
    const { locale } = useParams();
    const t = useTranslations();
    const [accounts, setAccounts] = useState<AdAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Token is now handled by /callback page before redirecting here
        // Load accounts immediately
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Check if user has auth token
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                router.push(`/${locale}/login`);
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

            // Check if user has already completed onboarding
            const onboardingStatus = await apiClient.get('/api/v1/auth/onboarding/status');
            if (onboardingStatus.data.onboarding_completed) {
                // Already completed quiz - go to dashboard
                router.push(`/${locale}/account-dashboard`);
            } else {
                // First time - go to quiz
                router.push(`/${locale}/quiz`);
            }
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
                        {t('accounts.link_your_accounts')}
                    </h1>
                    <p className="text-gray-400 text-lg">
                        {t('accounts.select_accounts_desc')}
                    </p>
                </div>

                {/* Main Content */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-red-200 font-medium">{t('accounts.error')}</p>
                                <p className="text-red-300/80 text-sm mt-1">{error}</p>
                            </div>
                            <button
                                onClick={handleRetry}
                                className="text-sm px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
                            >
                                {t('accounts.retry')}
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
                        {t('accounts.dont_see_accounts')}{' '}
                        <button
                            onClick={() => router.push(`/${locale}/connect`)}
                            className="text-accent hover:text-accent/80 underline"
                        >
                            {t('accounts.reconnect_facebook')}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
