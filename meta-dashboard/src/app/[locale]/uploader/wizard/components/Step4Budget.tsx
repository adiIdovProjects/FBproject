"use client";

import { useState, useEffect } from 'react';
import { Loader2, Lightbulb, AlertTriangle, ExternalLink, Calendar } from 'lucide-react';
import { useWizard } from './WizardContext';
import WizardNavigation from './WizardNavigation';
import { mutationsService, Pixel } from '@/services/mutations.service';

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
    accountId: string;
    currency: string;
}

// Currency symbol helper
const getCurrencySymbol = (currencyCode: string): string => {
    const symbols: Record<string, string> = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'ILS': '₪', 'JPY': '¥',
        'CAD': 'C$', 'AUD': 'A$', 'CHF': 'CHF', 'CNY': '¥', 'INR': '₹',
        'BRL': 'R$', 'MXN': '$', 'KRW': '₩', 'RUB': '₽', 'TRY': '₺',
        'PLN': 'zł', 'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr', 'NZD': 'NZ$',
        'SGD': 'S$', 'HKD': 'HK$', 'ZAR': 'R', 'AED': 'د.إ', 'SAR': '﷼',
    };
    return symbols[currencyCode] || currencyCode;
};

// Conversion events by objective
const CONVERSION_EVENTS = {
    SALES: ['PURCHASE', 'ADD_TO_CART', 'INITIATE_CHECKOUT', 'ADD_PAYMENT_INFO'],
    LEADS: ['LEAD', 'COMPLETE_REGISTRATION', 'CONTACT', 'SUBMIT_APPLICATION']
};

export default function Step4Budget({ t, accountId, currency }: Props) {
    const { state, dispatch } = useWizard();

    // Pixel state
    const [pixels, setPixels] = useState<Pixel[]>([]);
    const [isLoadingPixels, setIsLoadingPixels] = useState(false);

    // Determine if pixel is needed
    const needsPixel = state.objective === 'SALES' ||
        (state.objective === 'LEADS' && state.leadType === 'WEBSITE');

    // Load pixels if needed
    useEffect(() => {
        if (needsPixel && accountId) {
            setIsLoadingPixels(true);
            mutationsService.getPixels(accountId)
                .then((result) => {
                    setPixels(result);
                    // Auto-select first pixel if none selected
                    if (result.length > 0 && !state.selectedPixel) {
                        dispatch({ type: 'SET_PIXEL', pixelId: result[0].id });
                        // Auto-select first conversion event
                        const events = state.objective === 'SALES' ? CONVERSION_EVENTS.SALES : CONVERSION_EVENTS.LEADS;
                        dispatch({ type: 'SET_CONVERSION_EVENT', event: events[0] });
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoadingPixels(false));
        }
    }, [needsPixel, accountId, state.selectedPixel, state.objective, dispatch]);

    const conversionEvents = state.objective === 'SALES' ? CONVERSION_EVENTS.SALES : CONVERSION_EVENTS.LEADS;

    // Allow proceeding even without pixel (warning only, not blocking)
    // User can still try to run campaign - Facebook will show error if pixel required
    const hasPixelSetup = Boolean(state.selectedPixel && state.selectedConversionEvent);
    const canProceed = state.dailyBudget >= 1 && (!needsPixel || hasPixelSetup || pixels.length === 0);

    const handleNext = () => {
        if (canProceed) {
            dispatch({ type: 'SET_STEP', step: 6 });
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-200">{t('wizard.daily_budget')}</h2>

            {/* Budget Input */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-400">
                    {t('wizard.daily_budget')} ({currency})
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {getCurrencySymbol(currency)}
                    </span>
                    <input
                        type="number"
                        min="1"
                        value={state.dailyBudget}
                        onChange={(e) => dispatch({ type: 'SET_DAILY_BUDGET', budget: parseInt(e.target.value) || 1 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-3 text-lg font-bold focus:ring-2 focus:ring-green-500 outline-none"
                    />
                </div>

                {/* Budget tip */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
                    <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                    <span>{t('tips.budget_testing')}</span>
                </div>
            </div>

            {/* Campaign Schedule */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={state.useSchedule}
                        onChange={(e) => dispatch({ type: 'SET_USE_SCHEDULE', useSchedule: e.target.checked })}
                        className="w-4 h-4 accent-blue-500"
                    />
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">
                        {t('wizard.schedule_campaign') || 'Schedule campaign start/end dates'}
                    </span>
                </label>

                {state.useSchedule && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">
                                {t('wizard.start_date') || 'Start Date'}
                            </label>
                            <input
                                type="date"
                                value={state.startDate}
                                onChange={(e) => dispatch({ type: 'SET_START_DATE', date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {t('wizard.start_date_hint') || 'Leave empty to start immediately'}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">
                                {t('wizard.end_date') || 'End Date'}
                            </label>
                            <input
                                type="date"
                                value={state.endDate}
                                onChange={(e) => dispatch({ type: 'SET_END_DATE', date: e.target.value })}
                                min={state.startDate || new Date().toISOString().split('T')[0]}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {t('wizard.end_date_hint') || 'Leave empty to run indefinitely'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Pixel Selection (for SALES or LEADS+WEBSITE) */}
            {needsPixel && (
                <div className={`p-4 rounded-xl ${state.objective === 'SALES' ? 'bg-green-500/10 border border-green-500/30' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                    <label className="text-sm font-medium text-gray-300 mb-3 block">
                        {t('wizard.facebook_pixel')} <span className="text-red-400">*</span>
                    </label>

                    {isLoadingPixels ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('wizard.loading_pixels')}
                        </div>
                    ) : pixels.length > 0 ? (
                        <div className="space-y-3">
                            {/* Pixel Dropdown */}
                            <select
                                value={state.selectedPixel}
                                onChange={(e) => dispatch({ type: 'SET_PIXEL', pixelId: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">{t('wizard.select_pixel')}</option>
                                {pixels.map((pixel) => (
                                    <option key={pixel.id} value={pixel.id}>
                                        {pixel.name}
                                    </option>
                                ))}
                            </select>

                            {/* Conversion Event Dropdown */}
                            {state.selectedPixel && (
                                <div>
                                    <label className="text-sm font-medium text-gray-400 mb-1 block">
                                        {t('wizard.conversion_event')} <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={state.selectedConversionEvent}
                                        onChange={(e) => dispatch({ type: 'SET_CONVERSION_EVENT', event: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">{t('wizard.select_event')}</option>
                                        {conversionEvents.map((event) => (
                                            <option key={event} value={event}>
                                                {event.replace(/_/g, ' ')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-yellow-400 font-medium">
                                        {t('wizard.no_pixel_warning_title') || 'No Facebook Pixel Found'}
                                    </p>
                                    <p className="text-gray-400 text-sm mt-1">
                                        {t('wizard.no_pixel_warning_desc') || "Without a pixel, Facebook can't track conversions on your website. Your campaign may not optimize effectively."}
                                    </p>
                                    <a
                                        href="https://www.facebook.com/events_manager"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-flex items-center gap-1"
                                    >
                                        {t('wizard.setup_pixel_link') || 'Set up your pixel in Events Manager'}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <WizardNavigation
                onNext={handleNext}
                canProceed={canProceed}
                nextLabel={t('common.next') || 'Next'}
                backLabel={t('common.back') || 'Back'}
            />
        </div>
    );
}
