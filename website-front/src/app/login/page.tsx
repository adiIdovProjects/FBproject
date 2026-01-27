'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

const AuthPage = () => {
    const [isLogin, setIsLogin] = React.useState(true);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [name, setName] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleGoogleAuth = () => {
        window.location.href = `${API_BASE_URL}/api/v1/auth/google/login`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const endpoint = isLogin
            ? `${API_BASE_URL}/api/v1/auth/login`
            : `${API_BASE_URL}/api/v1/auth/register`;

        const payload = isLogin
            ? { email, password }
            : { email, password, full_name: name };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || (isLogin ? 'Login failed' : 'Signup failed'));
            }

            // Save token and redirect
            localStorage.setItem('token', data.access_token);
            window.location.href = `${APP_URL}/connect`;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center pt-16 px-4">
            {/* Step Indicators */}
            <div className="flex gap-2 mb-12">
                <div className="w-20 h-1 bg-slate-900 rounded-full"></div>
                <div className="w-20 h-1 bg-slate-200 rounded-full"></div>
                <div className="w-20 h-1 bg-slate-200 rounded-full"></div>
            </div>

            <div className="max-w-md w-full">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
                    {isLogin ? 'Welcome back' : 'Create account'}
                </h1>

                {/* Benefits or Subtext */}
                {!isLogin && (
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-green-600 text-lg">check</span>
                            <span>14-day free trial</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-green-600 text-lg">check</span>
                            <span>No credit card required</span>
                        </div>
                    </div>
                )}

                {isLogin && (
                    <p className="text-slate-600 mb-8">
                        Enter your credentials to access your account.
                    </p>
                )}

                {/* Google Auth Button */}
                <button
                    onClick={handleGoogleAuth}
                    className="w-full h-14 flex items-center justify-center gap-3 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 transition-all mb-8 font-semibold text-slate-700 shadow-sm"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
                </button>

                {error && <div className="mb-4 text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg">{error}</div>}

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="w-full h-14 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter 6 or more characters"
                            className="w-full h-14 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your first and last name"
                                className="w-full h-14 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                            />
                        </div>
                    )}

                    {!isLogin && (
                        <div className="flex items-start gap-3 py-2">
                            <input
                                type="checkbox"
                                id="marketing"
                                className="mt-1 size-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                            />
                            <label htmlFor="marketing" className="text-sm text-slate-700 cursor-pointer leading-tight">
                                I agree to receive Birch news and ad tips
                            </label>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 bg-[#FFEB3B] hover:bg-[#FDD835] text-slate-900 font-bold rounded-full transition-all active:scale-[0.98] shadow-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading
                            ? (isLogin ? 'Signing in...' : 'Creating account...')
                            : (isLogin ? 'Sign in with Email' : 'Sign up with Email')
                        }
                    </button>

                    {/* Toggle Mode */}
                    <div className="text-center mt-6">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-slate-600 hover:text-slate-900 font-medium text-sm underline underline-offset-4"
                        >
                            {isLogin
                                ? "Don't have an account? Sign up"
                                : "Already have an account? Log in"
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuthPage;
