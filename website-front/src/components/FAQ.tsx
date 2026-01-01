'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const FAQ = () => {
    const { faq } = landingPageData;
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-24 bg-white dark:bg-[#101622]" id="about">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 dark:text-white">Frequently Asked Questions</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">Everything you need to know about getting started.</p>
                </div>

                <div className="space-y-4">
                    {faq.map((item, i) => (
                        <div key={i} className="border border-slate-200 dark:border-[#324467] rounded-xl overflow-hidden">
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-[#151c2a] transition-colors"
                            >
                                <span className="font-bold dark:text-white">{item.question}</span>
                                <span className={`material-symbols-outlined transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}>
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
                                        <div className="p-6 pt-0 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-[#324467]/50 mt-4">
                                            {item.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                <div className="mt-16 p-8 rounded-2xl bg-[#135bec]/5 border border-[#135bec]/20 text-center">
                    <h4 className="font-bold dark:text-white mb-2">Still have questions?</h4>
                    <p className="text-sm text-slate-500 mb-6">Can't find the answer you're looking for? Please chat with our friendly team.</p>
                    <button className="px-6 py-2 rounded-lg bg-[#135bec] text-white font-bold text-sm">
                        Contact Support
                    </button>
                </div>
            </div>
        </section>
    );
};

export default FAQ;
