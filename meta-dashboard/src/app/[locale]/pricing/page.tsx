'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';
import { LandingNavbar, LandingFooter } from '@/components/landing';
import { useLocale } from 'next-intl';

const PricingPage = () => {
    const { pricingTiers, pricingFeatures } = landingPageData;
    const [adSpend, setAdSpend] = useState(5000);
    const locale = useLocale();

    const sliderStops = [0, 2000, 5000, 10000, 20000, 50000, 100000, 150000];

    const currentTier = useMemo(() => {
        for (const tier of pricingTiers) {
            if (adSpend <= tier.maxSpend) {
                return tier;
            }
        }
        return pricingTiers[pricingTiers.length - 1];
    }, [adSpend, pricingTiers]);

    const formatSpend = (value: number) => {
        if (value >= 100000) return '$100k+';
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
        return `$${value}`;
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value);
        setAdSpend(sliderStops[index]);
    };

    const currentStopIndex = sliderStops.findIndex(stop => stop >= adSpend);

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#101622]">
            <LandingNavbar />
            <main className="flex-1 pt-8 pb-16">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-4xl font-bold tracking-tight mb-4 dark:text-white">
                            Simple, Transparent Pricing
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            Pay based on your monthly ad spend. No hidden fees, no long-term contracts.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-slate-50 dark:bg-[#192233] rounded-3xl border border-slate-200 dark:border-[#324467] p-8 md:p-12 shadow-xl"
                    >
                        <div className="mb-10">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 text-center">
                                What&apos;s your monthly ad spend?
                            </label>

                            <div className="relative mb-6">
                                <input
                                    type="range"
                                    min="0"
                                    max={sliderStops.length - 1}
                                    value={currentStopIndex >= 0 ? currentStopIndex : 0}
                                    onChange={handleSliderChange}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#135bec]"
                                    style={{
                                        background: `linear-gradient(to right, #135bec 0%, #135bec ${(currentStopIndex / (sliderStops.length - 1)) * 100}%, #e2e8f0 ${(currentStopIndex / (sliderStops.length - 1)) * 100}%, #e2e8f0 100%)`
                                    }}
                                />
                                <div className="flex justify-between mt-2 text-xs text-slate-500">
                                    {sliderStops.map((stop, i) => (
                                        <span key={i} className={i === currentStopIndex ? 'text-[#135bec] font-semibold' : ''}>
                                            {formatSpend(stop)}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 bg-[#135bec]/10 text-[#135bec] px-4 py-2 rounded-full text-sm font-semibold">
                                    <span className="material-symbols-outlined text-base">payments</span>
                                    {formatSpend(adSpend)} monthly ad spend
                                </div>
                            </div>
                        </div>

                        <div className="text-center mb-10 pb-10 border-b border-slate-200 dark:border-[#324467]">
                            {currentTier.price === 'Contact' ? (
                                <>
                                    <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
                                        Let&apos;s Talk
                                    </div>
                                    <p className="text-slate-500">Custom pricing for high-volume advertisers</p>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-5xl font-bold text-slate-900 dark:text-white">
                                            ${currentTier.price}
                                        </span>
                                        <span className="text-xl text-slate-500">/month</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-[#135bec] text-lg">auto_awesome</span>
                                        <span>
                                            {typeof currentTier.credits === 'number'
                                                ? `${currentTier.credits} AI credits/month`
                                                : 'Custom AI credits'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mb-10">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 text-center uppercase tracking-wider">
                                Everything Included
                            </h3>
                            <ul className="grid sm:grid-cols-2 gap-3">
                                {pricingFeatures.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                        <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="text-center">
                            {currentTier.price === 'Contact' ? (
                                <Link
                                    href={`/${locale}/login`}
                                    className="inline-flex items-center gap-2 h-14 px-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg transition-all hover:translate-y-[-2px] hover:shadow-lg active:scale-95"
                                >
                                    <span>Contact Sales</span>
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </Link>
                            ) : (
                                <Link
                                    href={`/${locale}/login`}
                                    className="inline-flex items-center gap-2 h-14 px-10 rounded-xl bg-[#135bec] text-white font-bold text-lg transition-all hover:translate-y-[-2px] hover:shadow-lg hover:shadow-[#135bec]/30 active:scale-95"
                                >
                                    <span>Start 7-Day Free Trial</span>
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </Link>
                            )}
                            <p className="text-sm text-slate-500 mt-4">
                                No credit card required. Cancel anytime.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-12 text-center"
                    >
                        <div className="inline-flex items-start gap-3 bg-slate-100 dark:bg-[#192233] p-4 rounded-xl text-left max-w-xl">
                            <span className="material-symbols-outlined text-[#135bec] text-2xl mt-0.5">info</span>
                            <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">What are AI credits?</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Each question you ask our AI assistant uses 1 credit. Credits renew monthly.
                                    Most users find 75-100 credits plenty for regular campaign optimization.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-16"
                    >
                        <h3 className="text-xl font-bold text-center mb-6 dark:text-white">Full Pricing Breakdown</h3>
                        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-[#324467]">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-[#192233]">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Monthly Ad Spend</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Price</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">AI Credits</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-[#324467]">
                                    <tr className="bg-white dark:bg-[#101622]">
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">$0 - $2,000</td>
                                        <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">$25/mo</td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">75</td>
                                    </tr>
                                    <tr className="bg-slate-50 dark:bg-[#192233]">
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">$2,000 - $5,000</td>
                                        <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">$40/mo</td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">100</td>
                                    </tr>
                                    <tr className="bg-white dark:bg-[#101622]">
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">$5,000 - $10,000</td>
                                        <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">$60/mo</td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">250</td>
                                    </tr>
                                    <tr className="bg-slate-50 dark:bg-[#192233]">
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">$10,000 - $20,000</td>
                                        <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">$75/mo</td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">500</td>
                                    </tr>
                                    <tr className="bg-white dark:bg-[#101622]">
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">$20,000 - $50,000</td>
                                        <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">$95/mo</td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">1,000</td>
                                    </tr>
                                    <tr className="bg-slate-50 dark:bg-[#192233]">
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">$50,000 - $100,000</td>
                                        <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">$165/mo</td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">Custom</td>
                                    </tr>
                                    <tr className="bg-white dark:bg-[#101622]">
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">$100,000+</td>
                                        <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">Contact Us</td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">Custom</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </main>
            <LandingFooter />
        </div>
    );
};

export default PricingPage;
