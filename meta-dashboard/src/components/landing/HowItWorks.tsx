'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const HowItWorks = () => {
    const { howItWorks } = landingPageData;

    return (
        <section className="py-32 bg-slate-50 dark:bg-[#151c2a] overflow-hidden" id="how-it-works">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-4xl mx-auto mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black tracking-tight mb-6 dark:text-white"
                    >
                        {howItWorks.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-600 dark:text-slate-400 text-xl"
                    >
                        {howItWorks.subtitle}
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 lg:gap-16 relative">
                    {/* Connecting line */}
                    <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-1 bg-gradient-to-r from-[#0d9488]/20 via-[#0d9488]/40 to-[#0d9488]/20 rounded-full"></div>

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
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-[#0d9488] text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                                {index + 1}
                            </div>

                            {/* Icon container - bigger */}
                            <div className="relative z-10 flex size-36 lg:size-40 items-center justify-center rounded-3xl bg-white dark:bg-[#1e2736] border-2 border-slate-200 dark:border-[#324467] shadow-xl mb-8 group-hover:scale-105 transition-all duration-300 group-hover:border-[#0d9488] group-hover:shadow-[#0d9488]/20">
                                <span className="material-symbols-outlined text-6xl lg:text-7xl text-[#0d9488] group-hover:scale-110 transition-transform">
                                    {step.icon}
                                </span>
                            </div>

                            {/* Title - bigger */}
                            <h3 className="text-2xl lg:text-3xl font-bold mb-4 dark:text-white">{step.title}</h3>

                            {/* Description - bigger */}
                            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-sm">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="text-center mt-16"
                >
                    <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">
                        No switching between apps. No complicated setup.
                    </p>
                    <p className="text-[#0d9488] font-semibold text-xl">
                        Just results.
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

export default HowItWorks;
