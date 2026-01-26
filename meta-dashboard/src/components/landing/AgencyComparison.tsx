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
        <section className="py-24 bg-white dark:bg-[#101622]" id="comparison">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl font-bold tracking-tight mb-4 dark:text-white"
                    >
                        {agencyComparison.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-600 dark:text-slate-400 text-lg"
                    >
                        {agencyComparison.subtitle}
                    </motion.p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="rounded-2xl border border-slate-200 dark:border-[#324467] overflow-hidden shadow-lg"
                >
                    <div className="grid grid-cols-3 bg-slate-50 dark:bg-[#192233]">
                        <div className="p-4 font-semibold text-slate-600 dark:text-slate-400 text-sm"></div>
                        <div className="p-4 text-center font-bold text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-[#324467]">
                            Traditional Agency
                        </div>
                        <div className="p-4 text-center font-bold text-[#0d9488] bg-[#0d9488]/5 border-l border-slate-200 dark:border-[#324467]">
                            AdCaptain
                        </div>
                    </div>

                    {agencyComparison.items.map((item, index) => (
                        <div
                            key={item.feature}
                            className={`grid grid-cols-3 ${index !== agencyComparison.items.length - 1 ? 'border-b border-slate-200 dark:border-[#324467]' : ''}`}
                        >
                            <div className="p-4 font-medium text-slate-700 dark:text-slate-300 text-sm flex items-center">
                                {item.feature}
                            </div>
                            <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm border-l border-slate-200 dark:border-[#324467] flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-red-400 text-lg">close</span>
                                <span>{item.agency}</span>
                            </div>
                            <div className="p-4 text-center text-slate-700 dark:text-white text-sm bg-[#0d9488]/5 border-l border-slate-200 dark:border-[#324467] flex items-center justify-center gap-2 font-medium">
                                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
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
                    className="text-center mt-10"
                >
                    <Link
                        href={`/${locale}/login`}
                        className="inline-flex items-center gap-2 h-12 px-8 rounded-lg bg-[#0d9488] text-white font-bold text-base transition-all hover:translate-y-[-2px] hover:shadow-lg hover:shadow-[#0d9488]/30 active:scale-95"
                    >
                        <span>Start Your Free Trial</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                    <p className="text-sm text-slate-500 mt-3">No credit card required</p>
                </motion.div>
            </div>
        </section>
    );
};

export default AgencyComparison;
