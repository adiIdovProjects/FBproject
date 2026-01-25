'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const Testimonials = () => {
    const { testimonials } = landingPageData;

    return (
        <section className="py-24 bg-slate-50 dark:bg-[#151c2a]" id="testimonials">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 dark:text-white">Trusted by Business Owners Like You</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">Join hundreds of freelancers and small businesses taking control of their ads.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white dark:bg-[#1e2736] p-8 rounded-2xl border border-slate-200 dark:border-[#324467] shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <img src={t.avatar} alt={t.name} className="size-12 rounded-full border-2 border-[#135bec]/20" />
                                <div>
                                    <div className="font-bold dark:text-white">{t.name}</div>
                                    <div className="text-xs text-slate-500">{t.role}</div>
                                </div>
                            </div>
                            <div className="flex gap-1 mb-4">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <span key={s} className="material-symbols-outlined text-yellow-400 text-sm">star</span>
                                ))}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 italic">&quot;{t.content}&quot;</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
