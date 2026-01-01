'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const HowItWorks = () => {
    const { howItWorks } = landingPageData;

    return (
        <section className="py-24 bg-slate-50 dark:bg-[#151c2a] overflow-hidden" id="how-it-works">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl font-bold tracking-tight mb-4 dark:text-white"
                    >
                        {howItWorks.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-600 dark:text-slate-400 text-lg"
                    >
                        {howItWorks.subtitle}
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-3 gap-12 relative">
                    <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-[#135bec]/30 to-transparent border-t border-dashed border-slate-300 dark:border-slate-700"></div>

                    {howItWorks.steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2 }}
                            className="relative flex flex-col items-center text-center group"
                        >
                            <div className="relative z-10 flex size-24 items-center justify-center rounded-2xl bg-white dark:bg-[#1e2736] border border-slate-200 dark:border-[#324467] shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:border-[#135bec] group-hover:shadow-[#135bec]/10">
                                <span className="material-symbols-outlined text-4xl text-[#135bec] group-hover:rotate-12 transition-transform">
                                    {step.icon}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 dark:text-white">{step.title}</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;

