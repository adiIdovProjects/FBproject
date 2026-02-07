"use client";

import { useState, useEffect } from 'react';
import { DollarSign, Target, Users, MousePointer, X, MessageCircle, Phone, AlertTriangle, ExternalLink, Activity } from 'lucide-react';
import { useWizard } from './WizardContext';
import WizardNavigation from './WizardNavigation';
import { mutationsService } from '@/services/mutations.service';
import { fetchOptimizationSummary, OptimizationSummary } from '@/services/pixel.service';

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
    pageId: string;
    accountId: string;
}

export default function Step1Objective({ t, pageId, accountId }: Props) {
    const { state, dispatch } = useWizard();
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [checkingWhatsApp, setCheckingWhatsApp] = useState(false);
    const [optimizationData, setOptimizationData] = useState<OptimizationSummary | null>(null);

    // Fetch optimization summary to show smart hints
    useEffect(() => {
        if (accountId) {
            fetchOptimizationSummary(accountId, pageId || undefined)
                .then(setOptimizationData)
                .catch(() => {}); // Silent fail — hints are optional
        }
    }, [accountId, pageId]);

    // Map Facebook objective names to our internal names
    const objectiveMap: Record<string, string> = {
        'OUTCOME_SALES': 'SALES',
        'OUTCOME_LEADS': 'LEADS',
        'OUTCOME_TRAFFIC': 'TRAFFIC',
        'OUTCOME_ENGAGEMENT': 'ENGAGEMENT',
        'OUTCOME_MESSAGES': 'WHATSAPP',
        'OUTCOME_CALLS': 'CALLS',
    };

    const activeObjectives = new Set(
        (optimizationData?.active_objectives || []).map(o => objectiveMap[o] || o)
    );

    const hasPixelEvent = (eventName: string) =>
        optimizationData?.events?.some(e => e.event_name === eventName) ?? false;

    const handleGoalSelect = async (goal: 'SALES' | 'LEADS' | 'TRAFFIC' | 'ENGAGEMENT' | 'WHATSAPP' | 'CALLS') => {
        // For WhatsApp, check if connected first
        if (goal === 'WHATSAPP' && pageId) {
            setCheckingWhatsApp(true);
            try {
                const status = await mutationsService.checkWhatsAppStatus(pageId);
                if (!status.connected) {
                    setShowWhatsAppModal(true);
                    setCheckingWhatsApp(false);
                    return;
                }
            } catch (error) {
                console.error('Failed to check WhatsApp status:', error);
                // Allow selection if check fails
            }
            setCheckingWhatsApp(false);
        }

        dispatch({ type: 'SET_OBJECTIVE', objective: goal });
        // Reset lead type when changing objectives (except for LEADS)
        if (goal !== 'LEADS') {
            dispatch({ type: 'SET_LEAD_TYPE', leadType: null });
        }
    };


    // Render "Active" badge if objective is currently running on the account
    const renderActiveBadge = (objective: string) => {
        if (!optimizationData || !activeObjectives.has(objective)) return null;
        return (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                <Activity className="w-3 h-3" />
                {t('wizard.active_on_account') || 'Active on your account'}
            </span>
        );
    };

    // Show pixel warning when SALES is selected but no Purchase event
    const showSalesPixelWarning = state.objective === 'SALES' && optimizationData && !hasPixelEvent('Purchase') && optimizationData.has_pixel;

    const canProceed = state.objective !== null && !checkingWhatsApp;

    const handleNext = () => {
        if (canProceed) {
            dispatch({ type: 'SET_STEP', step: 2 });
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-200">{t('wizard.step_1_title')}</h2>

            {/* Campaign Name */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                    {t('wizard.campaign_name_optional')}
                </label>
                <input
                    type="text"
                    value={state.campaignName}
                    onChange={(e) => dispatch({ type: 'SET_CAMPAIGN_NAME', name: e.target.value })}
                    placeholder={`${t('wizard.campaign_placeholder')} - ${state.objective || 'CAMPAIGN'} - ${new Date().toISOString().split('T')[0]}`}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Goal Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* SALES */}
                <div
                    onClick={() => handleGoalSelect('SALES')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                        state.objective === 'SALES'
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                    }`}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${
                            state.objective === 'SALES' ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300'
                        }`}>
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">{t('wizard.sales')}</h3>
                            <p className="text-xs text-gray-400">{t('wizard.sales_desc')}</p>
                            {renderActiveBadge('SALES')}
                        </div>
                    </div>
                </div>

                {/* LEADS */}
                <div
                    onClick={() => handleGoalSelect('LEADS')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                        state.objective === 'LEADS'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                    }`}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${
                            state.objective === 'LEADS' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                        }`}>
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">{t('wizard.leads')}</h3>
                            <p className="text-xs text-gray-400">{t('wizard.leads_desc')}</p>
                            {renderActiveBadge('LEADS')}
                            {state.objective === 'LEADS' && state.leadType && (
                                <p className="text-xs text-blue-400 mt-1">
                                    ({state.leadType === 'FORM' ? t('wizard.instant_form') : t('wizard.website')})
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* TRAFFIC */}
                <div
                    onClick={() => handleGoalSelect('TRAFFIC')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                        state.objective === 'TRAFFIC'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                    }`}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${
                            state.objective === 'TRAFFIC' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'
                        }`}>
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">{t('wizard.traffic')}</h3>
                            <p className="text-xs text-gray-400">{t('wizard.traffic_desc')}</p>
                            {renderActiveBadge('TRAFFIC')}
                        </div>
                    </div>
                </div>

                {/* ENGAGEMENT */}
                <div
                    onClick={() => handleGoalSelect('ENGAGEMENT')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                        state.objective === 'ENGAGEMENT'
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                    }`}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${
                            state.objective === 'ENGAGEMENT' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'
                        }`}>
                            <MousePointer className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">{t('wizard.engagement')}</h3>
                            <p className="text-xs text-gray-400">{t('wizard.engagement_desc')}</p>
                            {renderActiveBadge('ENGAGEMENT')}
                        </div>
                    </div>
                </div>

                {/* WHATSAPP */}
                <div
                    onClick={() => !checkingWhatsApp && handleGoalSelect('WHATSAPP')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                        state.objective === 'WHATSAPP'
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                    } ${checkingWhatsApp ? 'opacity-50' : ''}`}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${
                            state.objective === 'WHATSAPP' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300'
                        }`}>
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">{t('wizard.whatsapp') || 'WhatsApp'}</h3>
                            <p className="text-xs text-gray-400">{t('wizard.whatsapp_desc') || 'Start conversations'}</p>
                        </div>
                    </div>
                </div>

                {/* CALLS */}
                <div
                    onClick={() => handleGoalSelect('CALLS')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                        state.objective === 'CALLS'
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                    }`}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${
                            state.objective === 'CALLS' ? 'bg-amber-500 text-white' : 'bg-gray-700 text-gray-300'
                        }`}>
                            <Phone className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">{t('wizard.calls') || 'Calls'}</h3>
                            <p className="text-xs text-gray-400">{t('wizard.calls_desc') || 'Get phone calls'}</p>
                            {state.objective === 'CALLS' && (
                                <p className="text-xs text-amber-400 mt-1 flex items-center justify-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {t('wizard.calls_tracking_note') || 'Clicks only tracked'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Pixel warning for SALES without Purchase event */}
            {showSalesPixelWarning && (
                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-yellow-300 font-medium">
                            {t('wizard.no_purchase_event_title') || 'No Purchase event detected on your pixel'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {t('wizard.no_purchase_event_desc') || "Your pixel is active but isn't tracking Purchase events. Facebook won't be able to optimize for sales without this event."}
                        </p>
                    </div>
                </div>
            )}

            {/* Smart warnings from business profile */}
            {optimizationData?.warnings?.map((warning, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400">{warning.message}</p>
                </div>
            ))}

            {/* WhatsApp Not Connected Modal */}
            {showWhatsAppModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-emerald-400">{t('wizard.whatsapp_not_connected_title') || 'WhatsApp Business Not Connected'}</h3>
                            <button
                                onClick={() => setShowWhatsAppModal(false)}
                                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                <MessageCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-300">
                                    {t('wizard.whatsapp_not_connected_desc') || 'To run WhatsApp ads, you need to connect WhatsApp Business to your Facebook Page. This must be done in Facebook Business Settings.'}
                                </p>
                            </div>

                            <a
                                href="https://business.facebook.com/settings/whatsapp-business-accounts"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full p-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
                            >
                                {t('wizard.whatsapp_setup_link') || 'Set up in Facebook Business Settings'}
                                <ExternalLink className="w-4 h-4" />
                            </a>

                            <button
                                onClick={() => setShowWhatsAppModal(false)}
                                className="w-full p-3 text-gray-400 hover:text-gray-300 text-sm transition-colors"
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <WizardNavigation
                onNext={handleNext}
                canProceed={canProceed}
                nextLabel={t('common.next') || 'Next'}
            />
        </div>
    );
}
