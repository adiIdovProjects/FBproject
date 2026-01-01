'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyState, generateState } from '@/utils/csrf';
import { useTranslations } from 'next-intl';
import { Loader2, ShieldAlert, Facebook, CheckCircle } from 'lucide-react';
import { getFacebookLoginUrl, fetchCurrentUser, UserProfile } from '@/services/auth.service';

export default function ConnectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations();
    const [status, setStatus] = useState<'verifying' | 'connect_facebook' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [user, setUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        const token = searchParams.get('token');
        const state = searchParams.get('state');
        const step = searchParams.get('step'); // 'google_done' or 'facebook_connected'

        if (!token) {
            // If no token in URL, check if we already have one
            const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (storedToken) {
                checkFacebookConnection();
            } else {
                setStatus('error');
                setErrorMessage('Status Check Failed: No authentication token received.');
            }
            return;
        }

        // CSRF Check for Facebook callback
        if (step === 'facebook_connected') {
            const isValidState = verifyState(state);
            if (!isValidState) {
                setStatus('error');
                setErrorMessage('Security Alert: CSRF state mismatch. This login attempt may be insecure.');
                return;
            }
        }

        // Store token
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
            document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;

            // Now check user profile to see if FB is connected
            checkFacebookConnection();
        }

    }, [searchParams, router]);

    const checkFacebookConnection = async () => {
        try {
            setStatus('verifying');
            const userData = await fetchCurrentUser();
            setUser(userData);

            if (userData.facebook_id) {
                setStatus('success');
                setTimeout(() => {
                    router.push('/en');
                }, 1500);
            } else {
                setStatus('connect_facebook');
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMessage('Failed to fetch user profile.');
        }
    };

    const handleConnectFacebook = () => {
        const state = generateState();
        const url = getFacebookLoginUrl(state);
        window.location.href = url;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1115]">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">

                {status === 'verifying' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <h2 className="text-xl font-bold text-white">Verifying Connection...</h2>
                        <p className="text-gray-400 text-sm">Securing your session</p>
                    </div>
                )}

                {status === 'connect_facebook' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mb-2">
                            <Facebook className="w-8 h-8" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Connect Facebook Ads</h2>
                            <p className="text-gray-400 text-sm">
                                Link your Facebook account to import your ad data and start analyzing.
                            </p>
                        </div>

                        <button
                            onClick={handleConnectFacebook}
                            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#1864D2] text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-xl group"
                        >
                            <Facebook className="w-5 h-5 fill-current" />
                            <span>Connect Facebook Account</span>
                        </button>

                        <button
                            onClick={() => router.push('/en')}
                            className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
                        >
                            Skip for now (Demo Mode)
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white">All Set!</h2>
                        <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Connection Failed</h2>
                        <p className="text-red-400 text-sm px-4">{errorMessage}</p>
                        <button
                            onClick={() => router.push('/en/login')}
                            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-bold"
                        >
                            Return to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
