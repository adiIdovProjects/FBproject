'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000';

interface AdAccount {
    account_id: string;
    name: string;
    currency: string;
}

const ConnectContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<AdAccount[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState<number>(2); // Default to Step 2 if reached this page

    useEffect(() => {
        const urlToken = searchParams.get('token');
        const step = searchParams.get('step');
        const storedToken = localStorage.getItem('adsai_token');

        const activeToken = urlToken || storedToken;

        if (activeToken) {
            setToken(activeToken);
            localStorage.setItem('adsai_token', activeToken);

            // If we just finished Google, we might not have FB accounts yet
            if (step === 'google_done') {
                setOnboardingStep(2);
                setIsLoading(false);
            } else {
                // Try to fetch accounts - if successful, we are in Step 3
                fetchAccounts(activeToken);
            }
        } else {
            router.push('/login');
        }
    }, [searchParams, router]);

    const fetchAccounts = async (authToken: string) => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/facebook/accounts`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAccounts(data);
                setOnboardingStep(3); // Ad Account Selection
            } else if (response.status === 401) {
                // FB not connected or token expired
                setOnboardingStep(2);
            }
        } catch {
            setOnboardingStep(2);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFacebookConnect = () => {
        window.location.href = `${API_BASE_URL}/api/v1/auth/facebook/login`;
    };

    const toggleAccount = (id: string) => {
        setSelectedAccounts(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const accountsToLink = accounts.filter(acc => selectedAccounts.includes(acc.account_id));

            const response = await fetch(`${API_BASE_URL}/api/v1/auth/facebook/accounts/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ accounts: accountsToLink })
            });

            if (response.ok) {
                window.location.href = `${DASHBOARD_URL}/en`;
            } else {
                alert('Failed to link accounts. Please try again.');
            }
        } catch {
            alert('An error occurred. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center pt-16 px-4">
            {/* Step Indicators */}
            <div className="flex gap-2 mb-12">
                <div className="w-20 h-1 bg-slate-900 rounded-full"></div>
                <div className={`w-20 h-1 rounded-full ${onboardingStep >= 2 ? 'bg-slate-900' : 'bg-slate-200'}`}></div>
                <div className={`w-20 h-1 rounded-full ${onboardingStep >= 3 ? 'bg-slate-900' : 'bg-slate-200'}`}></div>
            </div>

            <div className="max-w-4xl w-full">
                {onboardingStep === 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Connect Facebook Ads</h1>
                        <p className="text-slate-500 mb-12">Step 2: Link your Meta Business account to start analyzing your campaigns.</p>

                        <button
                            onClick={handleFacebookConnect}
                            className="h-16 px-12 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold rounded-full transition-all flex items-center gap-3 mx-auto shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Continue with Facebook
                        </button>
                    </motion.div>
                )}

                {onboardingStep === 3 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="mb-12 text-center">
                            <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Select Ad Accounts</h1>
                            <p className="text-slate-500">Pick the accounts you want AdsAI to monitor and spend insights on.</p>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="size-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {accounts.length === 0 ? (
                                    <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                                        <p className="text-slate-500">No ad accounts found.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {accounts.map((account) => (
                                                <label
                                                    key={account.account_id}
                                                    className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all cursor-pointer ${selectedAccounts.includes(account.account_id)
                                                        ? 'border-slate-900 bg-slate-50'
                                                        : 'border-slate-100 hover:border-slate-200 bg-white'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`size-10 rounded-lg flex items-center justify-center ${selectedAccounts.includes(account.account_id) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                                                            }`}>
                                                            <span className="material-symbols-outlined">campaign</span>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900">{account.name}</div>
                                                            <div className="text-xs text-slate-500 uppercase tracking-wider">{account.account_id} • {account.currency}</div>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={selectedAccounts.includes(account.account_id)}
                                                        onChange={() => toggleAccount(account.account_id)}
                                                    />
                                                    <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedAccounts.includes(account.account_id) ? 'bg-slate-900 border-slate-900' : 'border-slate-200'
                                                        }`}>
                                                        {selectedAccounts.includes(account.account_id) && (
                                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>

                                        <div className="mt-12 flex justify-center">
                                            <button
                                                onClick={handleSync}
                                                disabled={selectedAccounts.length === 0 || isSyncing}
                                                className="h-16 px-12 rounded-full bg-slate-900 text-white font-bold text-lg shadow-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-3"
                                            >
                                                {isSyncing ? (
                                                    <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <span className="material-symbols-outlined">sync</span>
                                                )}
                                                <span>Start Optimization</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

const ConnectPage = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ConnectContent />
        </Suspense>
    );
};

export default ConnectPage;
