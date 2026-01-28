'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';
import { useLocale } from 'next-intl';

const AgencyComparison = () => {
    const { agencyComparison } = landingPageData;
    const locale = useLocale();

    return (
        <section className="py-24 relative overflow-hidden" id="comparison">
            {/* Background */}
            <div className="absolute inset-0 bg-[#0B0F1A]"></div>

            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white"
                    >
                        {agencyComparison.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 text-xl"
                    >
                        {agencyComparison.subtitle}
                    </motion.p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/50 backdrop-blur"
                >
                    {/* Header */}
                    <div className="grid grid-cols-3">
                        <div className="p-5"></div>
                        <div className="p-5 text-center font-semibold text-slate-400 border-l border-white/10">
                            Traditional Agency
                        </div>
                        <div className="p-5 text-center font-bold text-white border-l border-white/10 bg-gradient-to-b from-indigo-500/20 to-transparent relative">
                            {/* Gradient top border */}
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500"></div>
                            AdCaptain
                        </div>
                    </div>

                    {/* Rows */}
                    {agencyComparison.items.map((item, index) => (
                        <div
                            key={item.feature}
                            className={`grid grid-cols-3 border-t border-white/10 ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                        >
                            <div className="p-5 font-medium text-slate-300 text-sm flex items-center">
                                {item.feature}
                            </div>
                            <div className="p-5 text-center text-slate-500 text-sm border-l border-white/10 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-red-400/80 text-lg">cancel</span>
                                <span>{item.agency}</span>
                            </div>
                            <div className="p-5 text-center text-white text-sm bg-indigo-500/5 border-l border-white/10 flex items-center justify-center gap-2 font-medium">
                                <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                                <span>{item.adcaptain}</span>
                            </div>
                        </div>
                    ))}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-center mt-12"
                >
                    <Link
                        href={`/${locale}/login`}
                        className="group relative inline-flex items-center gap-2 h-14 px-10 rounded-xl font-bold text-white text-base overflow-hidden transition-all hover:scale-105"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute inset-0 shadow-[0_0_40px_rgba(99,102,241,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="relative flex items-center gap-2">
                            Start Your Free Trial
                            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </span>
                    </Link>
                    <p className="text-sm text-slate-500 mt-4">No credit card required</p>
                </motion.div>
            </div>
        </section>
    );
};

export default AgencyComparison;
