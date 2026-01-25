'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

const LandingFooter = () => {
    const locale = useLocale();
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        product: [
            { name: 'Features', href: '#features' },
            { name: 'Pricing', href: `/${locale}/pricing` },
            { name: 'How it Works', href: '#how-it-works' },
        ],
        company: [
            { name: 'About', href: '#about' },
            { name: 'Contact', href: '#' },
        ],
        legal: [
            { name: 'Privacy Policy', href: '#' },
            { name: 'Terms of Service', href: '#' },
        ],
    };

    return (
        <footer className="bg-slate-50 dark:bg-[#0d1117] border-t border-slate-200 dark:border-[#232f48]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href={`/${locale}`} className="flex items-center gap-2 mb-4">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-[#135bec] text-white">
                                <span className="material-symbols-outlined text-xl">analytics</span>
                            </div>
                            <span className="text-lg font-extrabold tracking-tight dark:text-white">AdsAI</span>
                        </Link>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                            Take control of your Facebook ads. No agency required.
                        </p>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Product</h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#135bec] dark:hover:text-blue-400 transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Company</h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#135bec] dark:hover:text-blue-400 transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Legal</h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#135bec] dark:hover:text-blue-400 transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-[#232f48]">
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                        &copy; {currentYear} AdsAI. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default LandingFooter;
