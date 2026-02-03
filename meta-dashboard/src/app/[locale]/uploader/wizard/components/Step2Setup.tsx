"use client";

import { useState, useEffect } from 'react';
import { useWizard } from './WizardContext';
import WizardNavigation from './WizardNavigation';
import { mutationsService, Pixel } from '@/services/mutations.service';
import { fetchOptimizationSummary, PixelEvent } from '@/services/pixel.service';
import {
    AlertTriangle,
    ExternalLink,
    Loader2,
    CheckCircle2,
    MessageSquare,
    FileText,
    Sparkles,
    Globe,
    Activity
} from 'lucide-react';

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
    accountId: string;
    pageId: string;
}

interface LeadForm {
    id: string;
    name: string;
    status: string;
}

export default function Step2Setup({ t, accountId, pageId }: Props) {
    const { state, dispatch } = useWizard();

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [pixels, setPixels] = useState<Pixel[]>([]);
    const [leadForms, setLeadForms] = useState<LeadForm[]>([]);
    const [whatsAppConnected, setWhatsAppConnected] = useState<boolean | null>(null);
    const [pixelEvents, setPixelEvents] = useState<PixelEvent[]>([]);
    const [pixelHealth, setPixelHealth] = useState<string | null>(null);

    // Determine what setup is needed based on objective
    const needsPixel = state.objective === 'SALES' ||
        (state.objective === 'LEADS' && state.leadType === 'WEBSITE');
    const needsLeadForm = state.objective === 'LEADS' && state.leadType === 'FORM';
    const needsWhatsApp = state.objective === 'WHATSAPP';
    const noSetupNeeded = state.objective === 'TRAFFIC' ||
        state.objective === 'ENGAGEMENT' ||
        state.objective === 'CALLS';

    // Load required data based on objective
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                if (needsPixel) {
                    const pixelData = await mutationsService.getPixels(accountId);
                    setPixels(pixelData);
                    // Auto-select first pixel if available
                    if (pixelData.length > 0 && !state.selectedPixel) {
                        dispatch({ type: 'SET_PIXEL', pixelId: pixelData[0].id });
                    }

                    // Fetch pixel event stats
                    try {
                        const summary = await fetchOptimizationSummary(accountId, pageId || undefined);
                        setPixelEvents(summary.events || []);
                        if (summary.pixels?.length > 0) {
                            setPixelHealth(summary.pixels[0].health);
                        }
                    } catch {
                        // Silent fail — event stats are informational only
                    }
                }

                if (needsLeadForm && pageId) {
                    try {
                        const forms = await mutationsService.getLeadForms(pageId, accountId);
                        setLeadForms(forms);
                    } catch (e) {
                        console.error('Failed to load lead forms:', e);
                        setLeadForms([]);
                    }
                }

                if (needsWhatsApp && pageId) {
                    try {
                        const status = await mutationsService.checkWhatsAppStatus(pageId);
                        setWhatsAppConnected(status.connected);
                    } catch (e) {
                        console.error('Failed to check WhatsApp status:', e);
                        setWhatsAppConnected(false);
                    }
                }
            } catch (e) {
                console.error('Failed to load setup data:', e);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [accountId, pageId, needsPixel, needsLeadForm, needsWhatsApp]);

    // Auto-skip if no setup needed
    useEffect(() => {
        if (noSetupNeeded && !isLoading) {
            dispatch({ type: 'SET_STEP', step: 3 });
        }
    }, [noSetupNeeded, isLoading, dispatch]);

    // Check if setup is complete (or user has acknowledged warning)
    const hasPixelSetup = needsPixel ? (pixels.length > 0 && state.selectedPixel) : true;
    const hasLeadFormSetup = needsLeadForm ? leadForms.length > 0 : true;
    const hasWhatsAppSetup = needsWhatsApp ? whatsAppConnected : true;

    // Allow proceeding if lead type is selected (for LEADS) or if not a LEADS objective
    // Warning only, not blocking
    const canProceed = state.objective !== 'LEADS' || state.leadType !== null;

    const handleNext = () => {
        dispatch({ type: 'SET_STEP', step: 3 });
    };

    // If no setup needed, show brief message (will auto-skip)
    if (noSetupNeeded) {
        return (
            <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-400">{t('wizard.no_setup_needed') || 'No additional setup needed'}</p>
            </div>
        );
    }

    const handleLeadTypeSelect = (type: 'WEBSITE' | 'FORM') => {
        dispatch({ type: 'SET_LEAD_TYPE', leadType: type });
    };

    return (
        <div className="space-y-6">
            {/* Lead Type Selection (for LEADS objective only) - Always visible so user can change */}
            {state.objective === 'LEADS' && (
                <div className="p-6 bg-blue-500/5 rounded-xl border-2 border-blue-500/30 space-y-4">
                    <h2 className="text-xl font-bold text-blue-300">{t('wizard.lead_type_title')}</h2>
                    <p className="text-gray-400 text-sm">
                        {t('wizard.lead_type_desc') || 'Choose where you want to collect leads from your audience'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleLeadTypeSelect('FORM')}
                            className={`p-5 rounded-xl border-2 transition-all text-left ${
                                state.leadType === 'FORM'
                                    ? 'border-blue-500 bg-blue-500/20'
                                    : 'border-gray-700 hover:border-blue-500 hover:bg-blue-500/10'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-5 h-5 text-blue-400" />
                                <div className="font-bold text-white">{t('wizard.lead_type_form')}</div>
                            </div>
                            <p className="text-sm text-gray-400">{t('wizard.lead_type_form_desc')}</p>
                        </button>

                        <button
                            onClick={() => handleLeadTypeSelect('WEBSITE')}
                            className={`p-5 rounded-xl border-2 transition-all text-left ${
                                state.leadType === 'WEBSITE'
                                    ? 'border-blue-500 bg-blue-500/20'
                                    : 'border-gray-700 hover:border-blue-500 hover:bg-blue-500/10'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Globe className="w-5 h-5 text-blue-400" />
                                <div className="font-bold text-white">{t('wizard.lead_type_website')}</div>
                            </div>
                            <p className="text-sm text-gray-400">{t('wizard.lead_type_website_desc')}</p>
                        </button>
                    </div>
                </div>
            )}

            {/* Setup Check Header (show only after lead type is selected for LEADS, or for other objectives) */}
            {(state.objective !== 'LEADS' || state.leadType) && (
                <div>
                    <h2 className="text-xl font-bold text-gray-200">
                        {t('wizard.setup_check') || 'Setup Check'}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        {t('wizard.setup_check_desc') || "Let's make sure you have everything set up for the best results"}
                    </p>
                </div>
            )}

            {/* Pixel Setup Section */}
            {needsPixel && (
                <div className={`p-5 rounded-xl border-2 ${
                    isLoading
                        ? 'bg-gray-800/50 border-gray-700'
                        : pixels.length > 0
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${
                            isLoading
                                ? 'bg-gray-700'
                                : pixels.length > 0 ? 'bg-green-500/20' : 'bg-yellow-500/20'
                        }`}>
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                            ) : pixels.length > 0 ? (
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                            ) : (
                                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                            )}
                        </div>

                        <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-gray-400" />
                                <h3 className="font-semibold text-white">
                                    {t('wizard.facebook_pixel') || 'Facebook Pixel'}
                                </h3>
                            </div>

                            {isLoading ? (
                                <p className="text-gray-400 text-sm">
                                    {t('wizard.checking_pixel') || 'Checking for Facebook Pixel...'}
                                </p>
                            ) : pixels.length > 0 ? (
                                <>
                                    <p className="text-green-400 text-sm mb-3">
                                        {t('wizard.pixel_found') || 'Pixel found! Select which one to use:'}
                                    </p>
                                    <select
                                        value={state.selectedPixel}
                                        onChange={(e) => dispatch({ type: 'SET_PIXEL', pixelId: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                    >
                                        <option value="">{t('wizard.select_pixel') || 'Select a pixel...'}</option>
                                        {pixels.map((pixel) => (
                                            <option key={pixel.id} value={pixel.id}>
                                                {pixel.name}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Pixel Health & Event Stats */}
                                    {pixelHealth && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                pixelHealth === 'healthy' ? 'bg-green-400' :
                                                pixelHealth === 'active' ? 'bg-green-300' :
                                                pixelHealth === 'stale' ? 'bg-yellow-400' :
                                                'bg-red-400'
                                            }`} />
                                            <span className="text-xs text-gray-400">
                                                {pixelHealth === 'healthy' ? (t('wizard.pixel_healthy') || 'Pixel is firing (last 24h)') :
                                                 pixelHealth === 'active' ? (t('wizard.pixel_active') || 'Pixel active (last 7 days)') :
                                                 pixelHealth === 'stale' ? (t('wizard.pixel_stale') || 'Pixel is stale (>7 days)') :
                                                 (t('wizard.pixel_never_fired') || 'Pixel has never fired')}
                                            </span>
                                        </div>
                                    )}

                                    {pixelEvents.length > 0 && (
                                        <div className="mt-3 p-3 bg-gray-900/50 rounded-lg">
                                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                                <Activity className="w-3 h-3" />
                                                {t('wizard.available_events') || 'Available optimization events (last 30 days):'}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {pixelEvents.slice(0, 8).map((event) => (
                                                    <span
                                                        key={event.event_name}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300"
                                                    >
                                                        {event.event_name}
                                                        <span className="text-gray-500">({event.count.toLocaleString()})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="text-yellow-400 font-medium mb-2">
                                        {t('wizard.no_pixel_warning_title') || 'No Facebook Pixel Found'}
                                    </p>
                                    <p className="text-gray-300 text-sm mb-3">
                                        {t('wizard.no_pixel_warning_desc') ||
                                            "Without a pixel, Facebook can't track conversions on your website. Your campaign will show 0 conversions and Facebook's algorithm won't be able to optimize for results."}
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <a
                                            href="https://www.facebook.com/events_manager"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {t('wizard.setup_pixel_link') || 'Set Up Pixel in Events Manager'}
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                    <p className="text-gray-500 text-xs mt-3">
                                        {t('wizard.continue_without_pixel') || 'You can continue without a pixel, but tracking won\'t work.'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Lead Form Setup Section */}
            {needsLeadForm && (
                <div className={`p-5 rounded-xl border-2 ${
                    isLoading
                        ? 'bg-gray-800/50 border-gray-700'
                        : leadForms.length > 0
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${
                            isLoading
                                ? 'bg-gray-700'
                                : leadForms.length > 0 ? 'bg-green-500/20' : 'bg-yellow-500/20'
                        }`}>
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                            ) : leadForms.length > 0 ? (
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                            ) : (
                                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                            )}
                        </div>

                        <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <h3 className="font-semibold text-white">
                                    {t('wizard.lead_forms') || 'Lead Forms'}
                                </h3>
                            </div>

                            {isLoading ? (
                                <p className="text-gray-400 text-sm">
                                    {t('wizard.checking_lead_forms') || 'Checking for lead forms...'}
                                </p>
                            ) : leadForms.length > 0 ? (
                                <p className="text-green-400 text-sm">
                                    {t('wizard.lead_forms_found', { count: leadForms.length }) ||
                                        `${leadForms.length} lead form(s) found. You can select one in the ad creation step.`}
                                </p>
                            ) : (
                                <>
                                    <p className="text-yellow-400 font-medium mb-2">
                                        {t('wizard.no_lead_forms_title') || 'No Lead Forms Found'}
                                    </p>
                                    <p className="text-gray-300 text-sm mb-3">
                                        {t('wizard.no_lead_forms_desc') ||
                                            "You'll need to create a lead form to collect leads. You can create one in the ad creation step, or set one up in Facebook now."}
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <a
                                            href="https://www.facebook.com/ads/lead_gen"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {t('wizard.create_lead_form_facebook') || 'Create Form in Facebook'}
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                    <p className="text-gray-500 text-xs mt-3">
                                        {t('wizard.create_form_later') || 'You can also create a form in the ad creation step.'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Setup Section */}
            {needsWhatsApp && (
                <div className={`p-5 rounded-xl border-2 ${
                    isLoading
                        ? 'bg-gray-800/50 border-gray-700'
                        : whatsAppConnected
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${
                            isLoading
                                ? 'bg-gray-700'
                                : whatsAppConnected ? 'bg-green-500/20' : 'bg-yellow-500/20'
                        }`}>
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                            ) : whatsAppConnected ? (
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                            ) : (
                                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                            )}
                        </div>

                        <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-gray-400" />
                                <h3 className="font-semibold text-white">
                                    {t('wizard.whatsapp_business') || 'WhatsApp Business'}
                                </h3>
                            </div>

                            {isLoading ? (
                                <p className="text-gray-400 text-sm">
                                    {t('wizard.checking_whatsapp') || 'Checking WhatsApp connection...'}
                                </p>
                            ) : whatsAppConnected ? (
                                <p className="text-green-400 text-sm">
                                    {t('wizard.whatsapp_connected') || 'WhatsApp Business is connected to your page.'}
                                </p>
                            ) : (
                                <>
                                    <p className="text-yellow-400 font-medium mb-2">
                                        {t('wizard.whatsapp_not_connected_title') || 'WhatsApp Not Connected'}
                                    </p>
                                    <p className="text-gray-300 text-sm mb-3">
                                        {t('wizard.whatsapp_not_connected_desc') ||
                                            "To run WhatsApp ads, you need to connect WhatsApp Business to your Facebook Page."}
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <a
                                            href="https://business.facebook.com/settings/whatsapp"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {t('wizard.connect_whatsapp') || 'Connect WhatsApp Business'}
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
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
