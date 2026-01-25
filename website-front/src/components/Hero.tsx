'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const Hero = () => {
    const { hero } = landingPageData;
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % hero.platformImages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [hero.platformImages.length]);

    return (
        <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-40 overflow-hidden">
            {/* Background Decorative Element */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#135bec]/20 blur-[120px] rounded-full pointer-events-none opacity-50"></div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="flex flex-col gap-6 text-center lg:text-left"
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#135bec]/30 bg-[#135bec]/10 px-3 py-1 text-xs font-semibold text-[#135bec] w-fit mx-auto lg:mx-0">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#135bec] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#135bec]"></span>
                            </span>
                            {hero.trustBadges[0].text}
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight dark:text-white">
                            {hero.headline.split('.').map((part, i) => (
                                <React.Fragment key={i}>
                                    {i === 1 ? <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#135bec]">{part}</span> : part}
                                    {i === 0 && <span className="block"></span>}
                                </React.Fragment>
                            ))}
                        </h1>

                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0">
                            {hero.subheadline}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-2">
                            <Link href="/login" className="h-12 px-8 rounded-lg bg-[#135bec] text-white font-bold text-base transition-all hover:translate-y-[-2px] hover:shadow-lg hover:shadow-[#135bec]/30 flex items-center justify-center gap-2 active:scale-95">
                                <span>{hero.cta}</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                            <button className="h-12 px-8 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white font-semibold text-base transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">play_circle</span>
                                <span>Watch Demo</span>
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-sm text-slate-500 dark:text-slate-400 mt-4">
                            {hero.trustBadges.map((badge, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                    <span className={`material-symbols-outlined text-[#135bec] text-base`}>{badge.icon}</span>
                                    <span className="font-medium">{badge.text}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative lg:h-auto"
                    >
                        <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden aspect-video group bg-slate-900">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentImageIndex}
                                    initial={{ opacity: 0, scale: 1.1 }}
                                    animate={{ opacity: 0.6, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 1 }}
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url('${hero.platformImages[currentImageIndex]}')` }}
                                />
                            </AnimatePresence>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

                            {/* Animated Mock UI Overlays */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-center">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-6 shadow-xl relative z-10"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="h-3 w-24 bg-slate-600 rounded"></div>
                                        <div className="h-4 px-2 bg-[#135bec]/20 text-blue-400 text-[10px] flex items-center justify-center rounded font-bold uppercase tracking-wider">Analysis</div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="h-2 w-full bg-slate-700/50 rounded"></div>
                                        <div className="h-2 w-[80%] bg-slate-700/50 rounded"></div>
                                        <div className="grid grid-cols-3 gap-3 pt-2">
                                            <div className="h-12 bg-[#135bec]/10 border border-[#135bec]/20 rounded p-2 flex flex-col justify-center items-center">
                                                <div className="text-[10px] text-slate-500 uppercase">CTR</div>
                                                <div className="text-xs font-bold text-white">4.2%</div>
                                            </div>
                                            <div className="h-12 bg-green-500/10 border border-green-500/20 rounded p-2 flex flex-col justify-center items-center">
                                                <div className="text-[10px] text-slate-500 uppercase">ROAS</div>
                                                <div className="text-xs font-bold text-green-400">3.8x</div>
                                            </div>
                                            <div className="h-12 bg-[#135bec]/10 border border-[#135bec]/20 rounded p-2 flex flex-col justify-center items-center">
                                                <div className="text-[10px] text-slate-500 uppercase">Growth</div>
                                                <div className="text-xs font-bold text-blue-400">+12%</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Floating elements for "depth" */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute -bottom-6 -right-6 h-24 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-3 hidden sm:block z-20"
                        >
                            <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[#135bec] text-xs">auto_awesome</span>
                                AI Insight
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 leading-tight">
                                "Increase budget on Ad Set #3 for better ROAS"
                            </div>
                            <div className="text-[10px] font-bold mt-1.5 text-green-500">Potential +18% ROI</div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Hero;

