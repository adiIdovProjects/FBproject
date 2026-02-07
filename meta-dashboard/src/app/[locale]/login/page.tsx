'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateState } from '@/utils/csrf';
import { getGoogleLoginUrl, getFacebookLoginUrl } from '@/services/auth.service';
import { apiClient } from '@/services/apiClient';
import { Loader2, AlertCircle, Facebook } from 'lucide-react';
import AdstyrLogo from '@/components/common/AdstyrLogo';

export default function LoginPage() {
    const t = useTranslations();
    const router = useRouter();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const [error, setError] = useState('');
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    // Check if user is already logged in
    useEffect(() => {
        const checkSession = async () => {
            try {
                await apiClient.get('/api/v1/users/me');
                // User is logged in, redirect to dashboard
                router.replace(`/${locale}/homepage`);
            } catch {
                // Not logged in, show login page
                setIsCheckingSession(false);
            }
        };
        checkSession();
    }, [router, locale]);

    // Check for error query param (e.g., fb_already_linked)
    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam === 'fb_already_linked') {
            setError(t('auth.fbAlreadyLinked'));
        }
    }, [searchParams, t]);

    const handleGoogleLogin = () => {
        const state = generateState();
        const loginUrl = getGoogleLoginUrl(state);
        console.log('[Google Login] Redirecting to:', loginUrl);
        window.location.href = loginUrl;
    };

    const handleFacebookLogin = () => {
        const state = generateState();
        const loginUrl = getFacebookLoginUrl(state);
        window.location.href = loginUrl;
    };

    // Show loading while checking session
    if (isCheckingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A]">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] relative overflow-hidden">
            {/* Gradient blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/15 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/15 rounded-full blur-[120px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-pink-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

                    <div className="text-center mb-8">
                        {/* Logo */}
                        <div className="flex justify-center mb-4">
                            <AdstyrLogo size="xl" />
                        </div>
                        <p className="text-gray-400 font-medium">
                            {t('auth.login_title')}
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 mb-6">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* OAuth Login Buttons */}
                    <div className="space-y-3">
                        {/* Facebook Login Button */}
                        <button
                            onClick={handleFacebookLogin}
                            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#1864D2] text-white font-bold py-3.5 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-xl"
                        >
                            <Facebook className="w-5 h-5 fill-current" />
                            <span>{t('auth.continue_with_facebook')}</span>
                        </button>

                        {/* Google Login Button */}
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-bold py-3.5 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-xl"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>{t('auth.continue_with_google')}</span>
                        </button>
                    </div>

                    <div className="mt-6 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                        <p className="text-xs text-gray-400 text-center">
                            <strong className="text-blue-400">{t('auth.note')}</strong> {t('auth.facebook_required_note')}
                        </p>
                    </div>

                    <p className="mt-6 text-center text-xs text-gray-500">
                        {t('auth.secure_connection')}
                    </p>
                </div>
            </div>
        </div >
    );
}
