'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { verifyMagicLink } from '@/services/auth.service';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function VerifyMagicLinkPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { locale } = useParams();
    const t = useTranslations();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [error, setError] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setError('No token provided');
            return;
        }

        // Verify the magic link token
        verifyMagicLink(token)
            .then((response) => {
                // Store JWT token
                localStorage.setItem('token', response.access_token);

                setStatus('success');

                // Route based on onboarding status
                const { onboarding_status } = response;

                setTimeout(() => {
                    if (!onboarding_status.onboarding_completed) {
                        const nextStep = onboarding_status.next_step;

                        switch (nextStep) {
                            case 'connect_facebook':
                                router.push(`/${locale}/onboard/connect-facebook`);
                                break;
                            case 'select_accounts':
                                router.push(`/${locale}/select-accounts`);
                                break;
                            case 'complete_profile':
                                router.push(`/${locale}/quiz`);
                                break;
                            default:
                                router.push(`/${locale}/account-dashboard`);
                        }
                    } else {
                        // User is fully onboarded
                        router.push(`/${locale}/account-dashboard`);
                    }
                }, 1500);
            })
            .catch((err) => {
                console.error('Magic link verification failed:', err);
                setStatus('error');
                setError(err.response?.data?.detail || 'Invalid or expired magic link');
            });
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1115]">
            <div className="max-w-md w-full p-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
                    {status === 'verifying' && (
                        <>
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-6">
                                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">{t('auth.verifying')}</h2>
                            <p className="text-gray-400">{t('auth.please_wait_verifying')}</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-6">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">{t('auth.success')}</h2>
                            <p className="text-gray-400">{t('auth.being_redirected')}</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-6">
                                <AlertCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">{t('auth.verification_failed')}</h2>
                            <p className="text-red-400 mb-6">{error}</p>
                            <button
                                onClick={() => router.push(`/${locale}/login`)}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
                            >
                                {t('auth.back_to_login')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
