'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import AdstyrLogo from '@/components/common/AdstyrLogo';

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
            { name: 'Privacy Policy', href: `/${locale}/privacy-policy` },
            { name: 'Terms of Service', href: `/${locale}/terms` },
        ],
    };

    return (
        <footer className="relative bg-[#0B0F1A] border-t border-white/10">
            {/* Gradient top border */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                    {/* Brand column */}
                    <div className="col-span-2">
                        <Link href={`/${locale}`} className="inline-block mb-6">
                            <AdstyrLogo size="lg" />
                        </Link>
                        <p className="text-slate-400 mb-6 max-w-xs leading-relaxed">
                            Take control of your Facebook ads with AI-powered insights. No agency required.
                        </p>
                        {/* Social links */}
                        <div className="flex gap-3">
                            <a href="#" className="size-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                                <span className="text-lg font-bold">𝕏</span>
                            </a>
                            <a href="#" className="size-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                                <span className="material-symbols-outlined text-lg">mail</span>
                            </a>
                        </div>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4 text-sm">Product</h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4 text-sm">Company</h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4 text-sm">Legal</h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-500">
                        &copy; {currentYear} Adstyr. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-slate-500">
                        <Link href={`/${locale}/privacy-policy`} className="hover:text-indigo-400 transition-colors">Privacy</Link>
                        <Link href={`/${locale}/terms`} className="hover:text-indigo-400 transition-colors">Terms</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default LandingFooter;
