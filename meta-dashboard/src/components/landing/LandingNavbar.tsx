'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { apiClient } from '@/services/apiClient';

const LandingNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const locale = useLocale();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if user is logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        await apiClient.get('/api/v1/users/me');
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkSession();
  }, []);

  const navLinks = [
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: `/${locale}/pricing` },
    { name: 'About Us', href: '#about' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled
        ? 'border-b border-white/10 bg-[#0B0F1A]/80 backdrop-blur-xl'
        : 'bg-transparent'
        }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white transition-transform group-hover:scale-110 shadow-lg shadow-indigo-500/20">
              <span className="material-symbols-outlined text-xl">steering</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">Adstyr</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href={isLoggedIn ? `/${locale}/homepage` : `/${locale}/login`}
              className="hidden sm:flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Start Free Trial'}
            </Link>
            <button
              className="md:hidden p-2 text-slate-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="material-symbols-outlined">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0B0F1A]/95 backdrop-blur-xl border-b border-white/10 overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-base font-medium text-slate-300 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                href={isLoggedIn ? `/${locale}/homepage` : `/${locale}/login`}
                className="w-full h-12 flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {isLoggedIn ? 'Go to Dashboard' : 'Start Free Trial'}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default LandingNavbar;
