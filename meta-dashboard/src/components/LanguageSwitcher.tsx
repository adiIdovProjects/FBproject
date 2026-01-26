'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useEffect, useTransition } from 'react';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export default function LanguageSwitcher() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentLanguage = languages.find(lang => lang.code === currentLocale);

  const switchLanguage = (newLocale: string) => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-locale', newLocale);
    }

    startTransition(() => {
      // Remove current locale from pathname and add new locale
      // pathname is like "/en/settings", we want to replace "en" with newLocale
      const pathWithoutLocale = pathname.replace(new RegExp(`^/${currentLocale}`), '');
      const newPath = `/${newLocale}${pathWithoutLocale}`;

      console.log('[LanguageSwitcher] Switching from', currentLocale, 'to', newLocale);
      console.log('[LanguageSwitcher] Current pathname:', pathname);
      console.log('[LanguageSwitcher] Path without locale:', pathWithoutLocale);
      console.log('[LanguageSwitcher] New path:', newPath);

      // Full page reload is intentional - required to properly reinitialize i18n context
      // and ensure all translations are loaded for the new locale
      window.location.href = newPath;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-switcher')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative language-switcher">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-border-subtle bg-card-bg/50 backdrop-blur-xl text-foreground hover:border-accent/50 transition-all duration-300 disabled:opacity-50 shadow-2xl group"
        aria-label={t('common.switch_language')}
      >
        <span className="text-xl group-hover:scale-110 transition-transform">{currentLanguage?.flag}</span>
        <span className="text-xs font-black uppercase tracking-widest">{currentLanguage?.name}</span>
        <svg
          className={`w-4 h-4 transition-transform text-text-muted group-hover:text-foreground ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-3 right-0 bg-sidebar-bg rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-border-subtle overflow-hidden z-50 min-w-[200px] glass-effect border-glow">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => switchLanguage(language.code)}
              disabled={isPending}
              className={`w-full flex items-center gap-4 px-5 py-4 text-xs font-black uppercase tracking-widest transition-all duration-200 ${currentLocale === language.code ? 'bg-accent/20 text-foreground' : 'text-text-muted hover:bg-secondary/50 hover:text-foreground'
                }`}
            >
              <span className="text-xl">{language.flag}</span>
              <span>{language.name}</span>
              {currentLocale === language.code && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(99,102,241,1)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
