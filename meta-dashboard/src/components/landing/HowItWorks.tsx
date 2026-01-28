'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const HowItWorks = () => {
    const { howItWorks } = landingPageData;

    return (
        <section className="py-32 relative overflow-hidden" id="how-it-works">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F1A] via-[#0F1629] to-[#0B0F1A]"></div>
            {/* Radial gradient accent */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_50%)]"></div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-4xl mx-auto mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-white"
                    >
                        {howItWorks.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 text-xl leading-relaxed"
                    >
                        {howItWorks.subtitle}
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
                    {/* Animated connecting line */}
                    <div className="hidden md:block absolute top-20 left-[calc(16.67%+3rem)] right-[calc(16.67%+3rem)] h-px">
                        <div className="w-full h-full bg-gradient-to-r from-indigo-500/20 via-violet-500/40 to-indigo-500/20"></div>
                        <motion.div
                            className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
                            animate={{ x: ['-100%', '500%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        />
                    </div>

                    {howItWorks.steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2 }}
                            className="relative flex flex-col items-center text-center group"
                        >
                            {/* Step number badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                {index + 1}
                            </div>

                            {/* Icon container with glow */}
                            <div className="relative z-10 flex size-28 lg:size-32 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/30 mb-8 group-hover:border-indigo-400 transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 to-violet-500/0 group-hover:from-indigo-500/10 group-hover:to-violet-500/10 transition-all"></div>
                                <span className="material-symbols-outlined text-5xl lg:text-6xl text-indigo-400 group-hover:text-indigo-300 transition-colors group-hover:scale-110 transform duration-300">
                                    {step.icon}
                                </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-2xl lg:text-3xl font-bold mb-4 text-white">{step.title}</h3>

                            {/* Description */}
                            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom CTA text */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="text-center mt-20"
                >
                    <p className="text-slate-500 text-lg mb-2">
                        No switching between apps. No complicated setup.
                    </p>
                    <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 font-bold text-2xl">
                        Just results.
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

export default HowItWorks;
