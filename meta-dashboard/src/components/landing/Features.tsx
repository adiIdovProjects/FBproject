'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const Features = () => {
    const { features } = landingPageData;

    return (
        <section className="py-24 bg-white dark:bg-[#101622]" id="features">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight mb-6 dark:text-white">{features.title}</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
                            {features.subtitle}
                        </p>

                        <div className="grid sm:grid-cols-2 gap-8">
                            {features.items.map((feature, index) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex flex-col gap-3"
                                >
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#135bec]/10 text-[#135bec]">
                                        <span className="material-symbols-outlined text-xl">{feature.icon}</span>
                                    </div>
                                    <h4 className="font-bold dark:text-white">{feature.title}</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative"
                    >
                        <div className="aspect-square bg-gradient-to-br from-[#135bec]/20 to-transparent rounded-3xl p-8 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                            <div className="w-full h-full bg-[#192233] rounded-2xl shadow-2xl overflow-hidden border border-slate-700 relative group">
                                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                                    <div className="h-4 w-32 bg-slate-600 rounded"></div>
                                    <div className="h-6 w-16 bg-[#135bec] rounded"></div>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="h-32 w-full bg-[#111722] rounded flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-700 animate-pulse">analytics</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="h-3 w-full bg-slate-700 rounded"></div>
                                        <div className="h-3 w-[80%] bg-slate-700 rounded"></div>
                                        <div className="h-3 w-[60%] bg-slate-700 rounded"></div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-[#135bec]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Features;
