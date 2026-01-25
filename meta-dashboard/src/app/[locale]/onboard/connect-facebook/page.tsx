'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Facebook, ArrowRight, Info } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

export default function ConnectFacebookPage() {
    const router = useRouter();
    const { locale } = useParams();
    const t = useTranslations();
    const [connecting, setConnecting] = useState(false);

    const handleConnectFacebook = async () => {
        setConnecting(true);

        try {
            // Call the connect endpoint (auth via HttpOnly cookie)
            const response = await apiClient.get('/api/v1/auth/facebook/connect');

            if (response.data.url) {
                // Redirect to Facebook OAuth
                window.location.href = response.data.url;
            } else {
                setConnecting(false);
            }
        } catch (error: any) {
            // 401 errors handled by apiClient interceptor
            if (error.response?.status !== 401) {
                setConnecting(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1115] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-2xl p-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-medium">
                            {t('onboarding.step_of', { current: 1, total: 3 })}
                        </div>
                    </div>

                    {/* Facebook Icon */}
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#1877F2]/20 mb-6">
                        <Facebook className="w-12 h-12 text-[#1877F2]" />
                    </div>

                    <h1 className="text-4xl font-black text-white mb-4">
                        {t('onboarding.connect_facebook_title')}
                    </h1>

                    <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
                        {t('onboarding.connect_facebook_desc')}
                    </p>

                    {/* Info Box */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-8 max-w-lg mx-auto">
                        <div className="flex items-start gap-3 text-left">
                            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-blue-400 font-semibold mb-2">{t('onboarding.what_we_access')}</h3>
                                <ul className="text-gray-300 text-sm space-y-1">
                                    <li>• {t('onboarding.access_ad_account')}</li>
                                    <li>• {t('onboarding.access_campaign_data')}</li>
                                    <li>• {t('onboarding.access_insights')}</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Connect Button */}
                    <button
                        onClick={handleConnectFacebook}
                        disabled={connecting}
                        className="inline-flex items-center gap-3 bg-[#1877F2] hover:bg-[#1864D2] text-white font-bold text-lg py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <Facebook className="w-6 h-6 fill-current" />
                        <span>{connecting ? t('onboarding.connecting') : t('onboarding.connect_with_facebook')}</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>

                    <p className="mt-6 text-gray-500 text-sm">
                        {t('onboarding.redirect_to_facebook')}
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="mt-8 flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mb-2">
                            1
                        </div>
                        <span className="text-blue-400 text-sm font-medium">{t('onboarding.step_connect')}</span>
                    </div>
                    <div className="w-16 h-0.5 bg-white/10"></div>
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-500 font-bold mb-2">
                            2
                        </div>
                        <span className="text-gray-500 text-sm">{t('onboarding.step_select_accounts')}</span>
                    </div>
                    <div className="w-16 h-0.5 bg-white/10"></div>
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-500 font-bold mb-2">
                            3
                        </div>
                        <span className="text-gray-500 text-sm">{t('onboarding.step_complete_profile')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
