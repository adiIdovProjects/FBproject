'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const Pricing = () => {
    const { pricing } = landingPageData;

    return (
        <section className="py-24 bg-white dark:bg-[#101622]" id="pricing">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 dark:text-white">Simple, Transparent Pricing</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">Start for free, upgrade as you scale your impact.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-end">
                    {pricing.map((tier, index) => (
                        <motion.div
                            key={tier.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex flex-col rounded-2xl p-8 relative transition-all duration-300 ${tier.popular
                                ? 'bg-[#111722] border-2 border-[#135bec] shadow-2xl scale-105 z-10'
                                : 'bg-slate-50 dark:bg-[#192233] border border-slate-200 dark:border-[#324467] shadow-sm hover:shadow-md'
                                }`}
                        >
                            {tier.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#135bec] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Most Popular
                                </div>
                            )}

                            <h3 className={`text-lg font-bold ${tier.popular ? 'text-white' : 'dark:text-white'}`}>{tier.name}</h3>
                            <div className="flex items-baseline gap-1 mt-4">
                                <span className={`text-4xl font-bold ${tier.popular ? 'text-white' : 'dark:text-white'}`}>
                                    {tier.price !== 'Custom' && '$'}{tier.price}
                                </span>
                                {tier.price !== 'Custom' && (
                                    <span className={tier.popular ? 'text-slate-400' : 'text-slate-500'}>/mo</span>
                                )}
                            </div>
                            <p className={`mt-2 text-sm ${tier.popular ? 'text-slate-400' : 'text-slate-500'}`}>{tier.description}</p>

                            <div className="flex-1 mt-8">
                                <ul className="space-y-4 text-sm mb-8">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className={`flex items-center gap-3 ${tier.popular ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                            <span className={`material-symbols-outlined text-sm ${tier.popular ? 'text-blue-400' : 'text-green-500'}`}>
                                                check_circle
                                            </span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Link href="/login" className={`w-full py-3 rounded-lg font-bold transition-all active:scale-95 flex items-center justify-center ${tier.popular
                                ? 'bg-[#135bec] text-white hover:bg-opacity-90'
                                : 'border border-[#135bec] text-[#135bec] hover:bg-[#135bec] hover:text-white'
                                }`}>
                                {tier.cta}
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;

