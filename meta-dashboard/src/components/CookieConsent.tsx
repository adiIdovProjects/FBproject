'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Cookie, Shield } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const COOKIE_CONSENT_KEY = 'cookie_consent';
const COOKIE_CONSENT_VERSION = '1'; // Increment when policy changes

interface ConsentPreferences {
    necessary: boolean; // Always true, required for app to work
    analytics: boolean;
    marketing: boolean;
    version: string;
    timestamp: number;
}

export default function CookieConsent() {
    const t = useTranslations();
    const { locale } = useParams();
    const [showBanner, setShowBanner] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [preferences, setPreferences] = useState<ConsentPreferences>({
        necessary: true,
        analytics: false,
        marketing: false,
        version: COOKIE_CONSENT_VERSION,
        timestamp: 0,
    });

    useEffect(() => {
        // Check if user has already given consent
        const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as ConsentPreferences;
                // Show banner again if consent version changed
                if (parsed.version !== COOKIE_CONSENT_VERSION) {
                    setShowBanner(true);
                } else {
                    setPreferences(parsed);
                }
            } catch {
                setShowBanner(true);
            }
        } else {
            // No consent yet, show banner after a short delay
            const timer = setTimeout(() => setShowBanner(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const saveConsent = (newPreferences: ConsentPreferences) => {
        const consent = {
            ...newPreferences,
            version: COOKIE_CONSENT_VERSION,
            timestamp: Date.now(),
        };
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
        setPreferences(consent);
        setShowBanner(false);
        setShowPreferences(false);
    };

    const acceptAll = () => {
        saveConsent({
            necessary: true,
            analytics: true,
            marketing: true,
            version: COOKIE_CONSENT_VERSION,
            timestamp: Date.now(),
        });
    };

    const acceptNecessaryOnly = () => {
        saveConsent({
            necessary: true,
            analytics: false,
            marketing: false,
            version: COOKIE_CONSENT_VERSION,
            timestamp: Date.now(),
        });
    };

    const savePreferences = () => {
        saveConsent(preferences);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
            <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
                {!showPreferences ? (
                    // Main banner
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                <Cookie className="w-6 h-6 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {t('cookies.title') || 'We use cookies'}
                                </h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    {t('cookies.description') || 'We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. By clicking "Accept All", you consent to our use of cookies.'}
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={acceptAll}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                                    >
                                        {t('cookies.accept_all') || 'Accept All'}
                                    </button>
                                    <button
                                        onClick={acceptNecessaryOnly}
                                        className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                                    >
                                        {t('cookies.necessary_only') || 'Necessary Only'}
                                    </button>
                                    <button
                                        onClick={() => setShowPreferences(true)}
                                        className="px-5 py-2.5 text-gray-300 hover:text-white font-medium transition-colors"
                                    >
                                        {t('cookies.customize') || 'Customize'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                    {t('cookies.learn_more') || 'Learn more in our'}{' '}
                                    <Link href={`/${locale}/privacy-policy`} className="text-blue-400 hover:underline">
                                        {t('cookies.privacy_policy') || 'Privacy Policy'}
                                    </Link>
                                </p>
                            </div>
                            <button
                                onClick={acceptNecessaryOnly}
                                className="p-2 text-gray-400 hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    // Preferences panel
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Shield className="w-6 h-6 text-blue-400" />
                                <h3 className="text-lg font-semibold text-white">
                                    {t('cookies.preferences_title') || 'Cookie Preferences'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowPreferences(false)}
                                className="p-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            {/* Necessary cookies - always on */}
                            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-white">
                                        {t('cookies.necessary') || 'Necessary Cookies'}
                                    </h4>
                                    <p className="text-sm text-gray-400">
                                        {t('cookies.necessary_desc') || 'Required for the website to function. Cannot be disabled.'}
                                    </p>
                                </div>
                                <div className="w-12 h-6 bg-blue-600 rounded-full flex items-center justify-end px-1">
                                    <div className="w-4 h-4 bg-white rounded-full" />
                                </div>
                            </div>

                            {/* Analytics cookies */}
                            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-white">
                                        {t('cookies.analytics') || 'Analytics Cookies'}
                                    </h4>
                                    <p className="text-sm text-gray-400">
                                        {t('cookies.analytics_desc') || 'Help us understand how visitors interact with our website.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                                    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${
                                        preferences.analytics ? 'bg-blue-600 justify-end' : 'bg-gray-600 justify-start'
                                    }`}
                                >
                                    <div className="w-4 h-4 bg-white rounded-full" />
                                </button>
                            </div>

                            {/* Marketing cookies */}
                            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-white">
                                        {t('cookies.marketing') || 'Marketing Cookies'}
                                    </h4>
                                    <p className="text-sm text-gray-400">
                                        {t('cookies.marketing_desc') || 'Used to track visitors across websites for advertising purposes.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                                    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${
                                        preferences.marketing ? 'bg-blue-600 justify-end' : 'bg-gray-600 justify-start'
                                    }`}
                                >
                                    <div className="w-4 h-4 bg-white rounded-full" />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={savePreferences}
                                className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                            >
                                {t('cookies.save_preferences') || 'Save Preferences'}
                            </button>
                            <button
                                onClick={acceptAll}
                                className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                            >
                                {t('cookies.accept_all') || 'Accept All'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
