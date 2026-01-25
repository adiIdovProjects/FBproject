'use client';

import React from 'react';
import Link from 'next/link';

const Footer = () => {
    return (
        <footer className="bg-[#f6f6f8] dark:bg-[#0d121c] border-t border-slate-200 dark:border-[#232f48] pt-16 pb-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                    <div className="col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="flex size-6 items-center justify-center rounded bg-[#135bec] text-white">
                                <span className="material-symbols-outlined text-sm">analytics</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight dark:text-white">AdsAI</span>
                        </Link>
                        <p className="text-slate-500 max-w-xs text-sm leading-relaxed">
                            Empowering advertisers with AI-driven insights to scale campaigns faster and smarter than ever before.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-sm mb-4 dark:text-white">Product</h4>
                        <ul className="space-y-2 text-sm text-slate-500">
                            <li><Link href="#features" className="hover:text-[#135bec] transition-colors">Features</Link></li>
                            <li><Link href="#pricing" className="hover:text-[#135bec] transition-colors">Pricing</Link></li>
                            <li><Link href="#" className="hover:text-[#135bec] transition-colors">Integrations</Link></li>
                            <li><Link href="#" className="hover:text-[#135bec] transition-colors">Changelog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-sm mb-4 dark:text-white">Company</h4>
                        <ul className="space-y-2 text-sm text-slate-500">
                            <li><Link href="#about" className="hover:text-[#135bec] transition-colors">About Us</Link></li>
                            <li><Link href="#" className="hover:text-[#135bec] transition-colors">Blog</Link></li>
                            <li><Link href="#" className="hover:text-[#135bec] transition-colors">Careers</Link></li>
                            <li><Link href="#" className="hover:text-[#135bec] transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-sm mb-4 dark:text-white">Legal</h4>
                        <ul className="space-y-2 text-sm text-slate-500">
                            <li><Link href="/privacy-policy" className="hover:text-[#135bec] transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-[#135bec] transition-colors">Terms of Service</Link></li>
                            <li><Link href="/cookie-policy" className="hover:text-[#135bec] transition-colors">Cookie Policy</Link></li>
                            <li><button onClick={() => { localStorage.removeItem('cookie_consent'); window.location.reload(); }} className="hover:text-[#135bec] transition-colors">Cookie Settings</button></li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-200 dark:border-[#232f48]">
                    <p className="text-xs text-slate-500">© {new Date().getFullYear()} AdsAI Inc. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Systems Operational
                        </div>
                        <div className="flex gap-4">
                            <Link href="#" className="text-slate-400 hover:text-[#135bec]"><span className="material-symbols-outlined text-lg">public</span></Link>
                            <Link href="#" className="text-slate-400 hover:text-[#135bec]"><span className="material-symbols-outlined text-lg">mail</span></Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
