'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { generateState } from '@/utils/csrf';
import { getGoogleLoginUrl, loginWithEmail } from '@/services/auth.service';
import { BarChart3, ShieldCheck, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const t = useTranslations();
    const router = useRouter(); // Import useRouter
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleLogin = () => {
        // 1. Generate secure random state
        const state = generateState();

        // 2. Get login URL with state
        const loginUrl = getGoogleLoginUrl(state);

        // 3. Redirect user
        window.location.href = loginUrl;
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await loginWithEmail({ email, password });

            // Store token
            if (typeof window !== 'undefined') {
                localStorage.setItem('token', response.access_token);
                // Redirect to dashboard
                window.location.href = '/en/dashboard';
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || t('auth.login_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1115] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

                    <div className="text-center mb-8">
                        {/* Logo */}
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg shadow-blue-500/20">
                            <BarChart3 className="w-8 h-8 text-white" />
                        </div>

                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                            AdManager Pro
                        </h1>
                        <p className="text-gray-400 font-medium">
                            {t('auth.login_title')}
                        </p>
                    </div>

                    {/* Email Login Form */}
                    <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-300 ml-1">{t('auth.email')}</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-300 ml-1">{t('auth.password')}</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>{t('auth.sign_in')}</span>
                                    <ShieldCheck className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-[#16181D] text-gray-500">{t('auth.or_continue_with')}</span>
                        </div>
                    </div>

                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-bold py-3.5 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-xl group"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            {/* ... SVG paths ... */}
                        </svg>
                        <span>{t('auth.continue_with_google')}</span>
                    </button>

                    <p className="mt-8 text-center text-xs text-gray-500">
                        {t('auth.secure_connection')}
                    </p>
                </div>
            </div>
        </div >
    );
}

