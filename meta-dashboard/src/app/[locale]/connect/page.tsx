'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { verifyState, generateState } from '@/utils/csrf';
import { useTranslations } from 'next-intl';
import { Loader2, ShieldAlert, Facebook, CheckCircle } from 'lucide-react';
import { getFacebookLoginUrl, fetchCurrentUser, UserProfile } from '@/services/auth.service';

export default function ConnectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const locale = (params.locale as string) || 'en';
    const t = useTranslations();
    const [status, setStatus] = useState<'verifying' | 'connect_facebook' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [user, setUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        const state = searchParams.get('state');
        const step = searchParams.get('step'); // 'google_done' or 'facebook_connected'

        // CSRF Check for Facebook callback - block if invalid
        if (step === 'facebook_connected' && state) {
            const isValidState = verifyState(state);
            if (!isValidState) {
                console.error('CSRF state validation failed - blocking OAuth flow');
                setStatus('error');
                setErrorMessage('Security validation failed. Please try connecting again.');
                return;
            }
        }

        // Auth is now handled via HttpOnly cookies - just check Facebook connection
        checkFacebookConnection();

    }, [searchParams, router]);

    const checkFacebookConnection = async () => {
        try {
            setStatus('verifying');
            const userData = await fetchCurrentUser();
            setUser(userData);

            if (userData.facebook_id) {
                setStatus('success');
                // Redirect to account selection page after successful FB connection
                setTimeout(() => {
                    router.push(`/${locale}/select-accounts`);
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
        console.log('[Connect Page] Generated state:', state);
        console.log('[Connect Page] Facebook URL:', url);
        window.location.href = url;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1115]">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">

                {status === 'verifying' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <h2 className="text-xl font-bold text-white">{t('auth.verifying_connection')}</h2>
                        <p className="text-gray-400 text-sm">{t('auth.securing_session')}</p>
                    </div>
                )}

                {status === 'connect_facebook' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mb-2">
                            <Facebook className="w-8 h-8" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">{t('auth.connect_facebook_title')}</h2>
                            <p className="text-gray-400 text-sm">
                                {t('auth.connect_facebook_desc')}
                            </p>
                        </div>

                        <button
                            onClick={handleConnectFacebook}
                            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#1864D2] text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-xl group"
                        >
                            <Facebook className="w-5 h-5 fill-current" />
                            <span>{t('auth.connect_facebook_button')}</span>
                        </button>

                        <button
                            onClick={() => router.push(`/${locale}/homepage`)}
                            className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
                        >
                            {t('auth.skip_for_now')}
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white">{t('auth.all_set')}</h2>
                        <p className="text-gray-400 text-sm">{t('auth.redirecting')}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white">{t('auth.connection_failed')}</h2>
                        <p className="text-red-400 text-sm px-4">{errorMessage}</p>
                        <button
                            onClick={() => router.push(`/${locale}/login`)}
                            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-bold"
                        >
                            {t('auth.return_to_login')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
