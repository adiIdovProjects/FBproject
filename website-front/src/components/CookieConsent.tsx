'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type ConsentSettings = {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
};

const CONSENT_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0';

const defaultConsent: ConsentSettings = {
  necessary: true, // Always required
  analytics: false,
  functional: false,
  marketing: false,
};

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<ConsentSettings>(defaultConsent);

  useEffect(() => {
    // Check if consent has been given
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.version === CONSENT_VERSION) {
          setConsent(parsed.settings);
          applyConsent(parsed.settings);
          return;
        }
      } catch {
        // Invalid stored consent, show banner
      }
    }
    // No valid consent found, show banner
    setShowBanner(true);
  }, []);

  const applyConsent = (settings: ConsentSettings) => {
    // Apply consent settings to analytics/marketing scripts
    if (typeof window !== 'undefined') {
      // Google Analytics consent mode
      if ((window as unknown as { gtag?: (cmd: string, action: string, params: Record<string, string>) => void }).gtag) {
        (window as unknown as { gtag: (cmd: string, action: string, params: Record<string, string>) => void }).gtag('consent', 'update', {
          analytics_storage: settings.analytics ? 'granted' : 'denied',
          ad_storage: settings.marketing ? 'granted' : 'denied',
          ad_personalization: settings.marketing ? 'granted' : 'denied',
          ad_user_data: settings.marketing ? 'granted' : 'denied',
          functionality_storage: settings.functional ? 'granted' : 'denied',
        });
      }

      // Meta Pixel consent (if using Meta Consent Mode)
      if ((window as unknown as { fbq?: (cmd: string, action: string, params?: Record<string, boolean>) => void }).fbq) {
        if (settings.marketing) {
          (window as unknown as { fbq: (cmd: string, action: string, params?: Record<string, boolean>) => void }).fbq('consent', 'grant');
        } else {
          (window as unknown as { fbq: (cmd: string, action: string, params?: Record<string, boolean>) => void }).fbq('consent', 'revoke');
        }
      }
    }
  };

  const saveConsent = (settings: ConsentSettings) => {
    const data = {
      version: CONSENT_VERSION,
      settings,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    setConsent(settings);
    applyConsent(settings);
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      functional: true,
      marketing: true,
    });
  };

  const rejectAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      functional: false,
      marketing: false,
    });
  };

  const savePreferences = () => {
    saveConsent(consent);
  };

  const toggleCategory = (category: keyof ConsentSettings) => {
    if (category === 'necessary') return; // Cannot disable necessary cookies
    setConsent((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      {/* Backdrop for settings modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 pointer-events-auto"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Main Banner */}
      {!showSettings && (
        <div className="pointer-events-auto w-full max-w-4xl bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232f48] p-6 animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2 dark:text-white">We value your privacy</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                We use cookies to enhance your browsing experience, analyze site traffic, and personalize content.
                You can choose to accept all cookies or customize your preferences.{' '}
                <Link href="/cookie-policy" className="text-[#135bec] hover:underline">
                  Learn more
                </Link>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* GDPR requires equal prominence - same styling for both buttons */}
              <button
                onClick={rejectAll}
                className="px-6 py-2.5 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-6 py-2.5 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Customize
              </button>
              <button
                onClick={acceptAll}
                className="px-6 py-2.5 rounded-lg border-2 border-[#135bec] bg-[#135bec] text-white font-semibold hover:bg-[#0f4ed8] transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="pointer-events-auto w-full max-w-2xl bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232f48] max-h-[80vh] overflow-hidden animate-slide-up">
          <div className="p-6 border-b border-slate-200 dark:border-[#232f48]">
            <h3 className="text-xl font-bold dark:text-white">Cookie Preferences</h3>
            <p className="text-sm text-slate-500 mt-1">
              Manage your cookie preferences. Necessary cookies cannot be disabled.
            </p>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh]">
            {/* Necessary Cookies */}
            <div className="p-4 bg-slate-50 dark:bg-[#232f48] rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold dark:text-white">Strictly Necessary</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Essential for the website to function. Cannot be disabled.
                  </p>
                </div>
                <div className="w-12 h-7 bg-[#135bec] rounded-full relative cursor-not-allowed opacity-60">
                  <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full" />
                </div>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="p-4 bg-slate-50 dark:bg-[#232f48] rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold dark:text-white">Analytics</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Help us understand how visitors interact with our website.
                  </p>
                </div>
                <button
                  onClick={() => toggleCategory('analytics')}
                  className={`w-12 h-7 rounded-full relative transition-colors ${
                    consent.analytics ? 'bg-[#135bec]' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                      consent.analytics ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="p-4 bg-slate-50 dark:bg-[#232f48] rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold dark:text-white">Functional</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Enable personalized features like language preferences.
                  </p>
                </div>
                <button
                  onClick={() => toggleCategory('functional')}
                  className={`w-12 h-7 rounded-full relative transition-colors ${
                    consent.functional ? 'bg-[#135bec]' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                      consent.functional ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="p-4 bg-slate-50 dark:bg-[#232f48] rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold dark:text-white">Marketing</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Used to deliver relevant advertisements and track campaigns.
                  </p>
                </div>
                <button
                  onClick={() => toggleCategory('marketing')}
                  className={`w-12 h-7 rounded-full relative transition-colors ${
                    consent.marketing ? 'bg-[#135bec]' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                      consent.marketing ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-200 dark:border-[#232f48] flex gap-3 justify-end">
            <button
              onClick={rejectAll}
              className="px-6 py-2.5 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={savePreferences}
              className="px-6 py-2.5 rounded-lg border-2 border-[#135bec] bg-[#135bec] text-white font-semibold hover:bg-[#0f4ed8] transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Export a function to open cookie settings (for footer link)
export function openCookieSettings() {
  localStorage.removeItem(CONSENT_KEY);
  window.location.reload();
}
