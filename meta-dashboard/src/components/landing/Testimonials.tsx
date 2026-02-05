'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const Testimonials = () => {
    const { testimonials } = landingPageData;

    return (
        <section className="py-24 relative overflow-hidden" id="testimonials">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F1A] via-[#0F1629] to-[#0B0F1A]"></div>
            {/* Gradient accent */}
            <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-indigo-500/10 rounded-full blur-[128px]"></div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white"
                    >
                        Trusted by 2,500+ Marketers & Small Businesses
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 text-xl"
                    >
                        See why marketers are switching from expensive agencies to Adstyr.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="relative group"
                        >
                            {/* Gradient border on hover */}
                            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500/0 via-violet-500/0 to-pink-500/0 group-hover:from-indigo-500/50 group-hover:via-violet-500/50 group-hover:to-pink-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>

                            <div className="relative bg-slate-900/50 backdrop-blur p-8 rounded-2xl border border-white/10 hover:border-white/20 transition-colors h-full">
                                {/* Large quote mark */}
                                <div className="absolute top-6 right-6 text-6xl font-serif text-indigo-500/20">&quot;</div>

                                {/* Outcome badge */}
                                {'outcome' in t && (
                                    <div className="absolute -top-3 -right-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                                        {t.outcome}
                                    </div>
                                )}

                                {/* Avatar with gradient ring */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="relative">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full blur opacity-50"></div>
                                        <img src={t.avatar} alt={t.name} className="relative size-14 rounded-full border-2 border-white/20 object-cover" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{t.name}</div>
                                        <div className="text-sm text-indigo-400">{t.role}</div>
                                    </div>
                                </div>

                                {/* Stars with gold glow */}
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <span key={s} className="material-symbols-outlined text-yellow-400 text-base star-glow">star</span>
                                    ))}
                                </div>

                                <p className="text-slate-200 leading-relaxed text-lg line-clamp-4 sm:line-clamp-none">&quot;{t.content}&quot;</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
