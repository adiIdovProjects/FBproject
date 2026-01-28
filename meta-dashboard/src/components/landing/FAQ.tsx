'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const FAQ = () => {
    const { faq } = landingPageData;
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-24 relative overflow-hidden" id="about">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F1A] via-[#0F1629] to-[#0B0F1A]"></div>
            {/* Gradient accent */}
            <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[128px]"></div>

            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white"
                    >
                        Frequently Asked Questions
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 text-xl"
                    >
                        Everything you need to know about getting started.
                    </motion.p>
                </div>

                <div className="space-y-4">
                    {faq.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] backdrop-blur"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors group"
                            >
                                <span className="font-semibold text-white text-lg group-hover:text-indigo-400 transition-colors">{item.question}</span>
                                <span className={`material-symbols-outlined text-indigo-400 transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>
                            <AnimatePresence>
                                {openIndex === i && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="px-6 pb-6 text-slate-400 leading-relaxed border-t border-white/10 pt-4">
                                            {item.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>

                {/* Support card with gradient */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-16 relative"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 rounded-2xl blur opacity-20"></div>
                    <div className="relative p-8 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10 text-center">
                        <h4 className="font-bold text-white text-xl mb-2">Still have questions?</h4>
                        <p className="text-slate-400 mb-6">Our team is here to help you succeed.</p>
                        <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all">
                            Contact Support
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default FAQ;
