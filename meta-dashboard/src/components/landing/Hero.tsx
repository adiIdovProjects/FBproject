'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';
import { useLocale } from 'next-intl';

const Hero = () => {
    const { hero } = landingPageData;
    const locale = useLocale();

    return (
        <section className="relative pt-24 pb-32 lg:pt-36 lg:pb-48 overflow-hidden">
            {/* Animated gradient mesh background */}
            <div className="absolute inset-0 bg-[#0B0F1A]">
                {/* Primary indigo blob */}
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/30 rounded-full blur-[128px] animate-blob" />
                {/* Secondary violet blob */}
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-[128px] animate-blob animation-delay-2000" />
                {/* Pink accent blob */}
                <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-pink-500/15 rounded-full blur-[100px] animate-blob animation-delay-4000" />
                {/* Subtle grid pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="flex flex-col gap-6 text-center lg:text-left"
                    >
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 rounded-full border border-indigo-500/50 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 w-fit mx-auto lg:mx-0 backdrop-blur-sm"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-300"></span>
                            </span>
                            {hero.trustBadges[0].text}
                        </motion.div>

                        {/* Main headline with gradient text */}
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight">
                            <span className="text-white">{hero.headline}</span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-xl text-slate-300 md:text-2xl max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            {hero.subheadline}
                        </p>

                        {/* CTA buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-2">
                            <Link
                                href={`/${locale}/login`}
                                className="group relative h-14 px-10 rounded-xl font-bold text-white text-base overflow-hidden transition-all hover:scale-105 flex items-center justify-center gap-2"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute inset-0 shadow-[0_0_40px_rgba(99,102,241,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="relative flex items-center gap-2">
                                    {hero.cta}
                                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </span>
                            </Link>
                            <button className="h-14 px-10 rounded-xl font-semibold text-white text-base border border-white/20 hover:border-white/40 bg-white/5 backdrop-blur hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">play_circle</span>
                                Watch Demo
                            </button>
                        </div>

                        {/* Trust badges */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-6">
                            {hero.trustBadges.map((badge, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + i * 0.1 }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur border border-indigo-500/50 hover:border-indigo-500/70 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-indigo-300 text-base">{badge.icon}</span>
                                    <span className="text-sm text-indigo-200 font-medium">{badge.text}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Mobile dashboard preview */}
                        <div className="lg:hidden mt-8">
                            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">ROAS</div>
                                        <div className="text-2xl font-black text-white">3.8x</div>
                                        <div className="text-xs text-green-400 font-medium mt-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">trending_up</span>
                                            +12%
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/20 rounded-xl p-4">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">CTR</div>
                                        <div className="text-2xl font-black text-white">4.2%</div>
                                        <div className="text-xs text-green-400 font-medium mt-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">trending_up</span>
                                            +0.8%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right side - Dashboard preview (Desktop) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative lg:h-auto hidden lg:block"
                    >
                        {/* Outer glow effect */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-60"></div>

                        {/* Dashboard card */}
                        <div className="relative bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            {/* Window chrome */}
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                                <div className="window-dot window-dot-red"></div>
                                <div className="window-dot window-dot-yellow"></div>
                                <div className="window-dot window-dot-green"></div>
                                <span className="ml-4 text-xs text-slate-500 font-medium">Adstyr Dashboard</span>
                            </div>

                            {/* Dashboard content */}
                            <div className="p-6">
                                {/* Metrics row */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">ROAS</div>
                                        <div className="text-2xl font-black text-white">3.8x</div>
                                        <div className="text-xs text-green-400 font-medium mt-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">trending_up</span>
                                            +12%
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/20 rounded-xl p-4">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">CTR</div>
                                        <div className="text-2xl font-black text-white">4.2%</div>
                                        <div className="text-xs text-green-400 font-medium mt-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">trending_up</span>
                                            +0.8%
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/20 rounded-xl p-4">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">CPA</div>
                                        <div className="text-2xl font-black text-white">$12.40</div>
                                        <div className="text-xs text-green-400 font-medium mt-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">trending_down</span>
                                            -18%
                                        </div>
                                    </div>
                                </div>

                                {/* Chart area */}
                                <div className="h-32 rounded-xl bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-pink-500/10 border border-white/5 relative overflow-hidden">
                                    {/* SVG chart line */}
                                    <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#6366F1" />
                                                <stop offset="50%" stopColor="#8B5CF6" />
                                                <stop offset="100%" stopColor="#EC4899" />
                                            </linearGradient>
                                            <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d="M0,80 Q50,70 100,60 T200,40 T300,50 T400,30"
                                            stroke="url(#chartGradient)"
                                            strokeWidth="3"
                                            fill="none"
                                        />
                                        <path
                                            d="M0,80 Q50,70 100,60 T200,40 T300,50 T400,30 L400,120 L0,120 Z"
                                            fill="url(#chartFill)"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Floating AI insight card */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute -bottom-6 -right-6 bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-indigo-500/30 p-4 hidden sm:block z-20 max-w-[200px]"
                        >
                            <div className="flex items-center gap-2 text-xs text-indigo-400 mb-2">
                                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                <span className="font-semibold">AI Insight</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                &quot;Your weekend campaign is outperforming — consider scaling up.&quot;
                            </p>
                            <div className="text-xs font-bold mt-2 text-green-400">
                                Potential +18% ROI
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
