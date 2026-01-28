'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const Features = () => {
    const { features } = landingPageData;

    return (
        <section className="py-24 relative overflow-hidden" id="features">
            {/* Background */}
            <div className="absolute inset-0 bg-[#0B0F1A]"></div>
            {/* Subtle gradient accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[128px]"></div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left side - Text content */}
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-white"
                        >
                            {features.title}
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-slate-400 text-xl mb-12 leading-relaxed"
                        >
                            {features.subtitle}
                        </motion.p>

                        <div className="grid sm:grid-cols-2 gap-6">
                            {features.items.map((feature, index) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]"
                                >
                                    {/* Icon with gradient background */}
                                    <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 mb-4 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-2xl text-indigo-400">{feature.icon}</span>
                                    </div>
                                    <h4 className="font-bold text-white text-lg mb-2">{feature.title}</h4>
                                    <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Right side - Abstract visualization */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative hidden lg:block"
                    >
                        <div className="aspect-square rounded-3xl bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-pink-500/10 border border-white/10 p-8 relative overflow-hidden">
                            {/* Decorative elements */}
                            <div className="absolute top-8 right-8 w-32 h-32 rounded-full border border-indigo-500/30"></div>
                            <div className="absolute bottom-12 left-12 w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-transparent"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-dashed border-indigo-500/20"></div>

                            {/* Central card */}
                            <div className="absolute inset-12 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                                    <span className="material-symbols-outlined text-3xl text-white">insights</span>
                                </div>
                                <p className="text-white font-bold text-lg">AI-Powered</p>
                                <p className="text-slate-400 text-sm">Analytics Platform</p>

                                {/* Stats indicators */}
                                <div className="flex gap-4 mt-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-indigo-400">+47%</div>
                                        <div className="text-xs text-slate-500">ROAS</div>
                                    </div>
                                    <div className="w-px bg-white/10"></div>
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-violet-400">-32%</div>
                                        <div className="text-xs text-slate-500">CPA</div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating badges */}
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute top-6 left-6 bg-slate-900/90 backdrop-blur rounded-lg px-3 py-2 border border-indigo-500/30"
                            >
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                                    <span className="text-slate-300">Real-time sync</span>
                                </div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
                                className="absolute bottom-6 right-6 bg-slate-900/90 backdrop-blur rounded-lg px-3 py-2 border border-violet-500/30"
                            >
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="material-symbols-outlined text-violet-400 text-sm">auto_awesome</span>
                                    <span className="text-slate-300">AI Insights</span>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Features;
