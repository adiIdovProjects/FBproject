"use client";

import { Plus, CheckCircle, Copy } from 'lucide-react';
import { useWizard, AdCreative } from './WizardContext';
import WizardNavigation from './WizardNavigation';
import AdCard from './AdCard';

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
    locale: string;
    pageId: string;
    accountId: string;
    isSubmitting: boolean;
    onSubmit: () => void;
}

const MAX_ADS = 5;

export default function Step5Ads({ t, locale, pageId, accountId, isSubmitting, onSubmit }: Props) {
    const { state, dispatch } = useWizard();

    const isLeadForm = state.objective === 'LEADS' && state.leadType === 'FORM';
    const isWhatsApp = state.objective === 'WHATSAPP';
    const isCalls = state.objective === 'CALLS';
    const needsUrl = !isLeadForm && !isWhatsApp && !isCalls;

    // Get default CTA based on objective
    const getDefaultCTA = () => {
        if (isWhatsApp) return 'WHATSAPP_MESSAGE';
        if (isCalls) return 'CALL_NOW';
        return 'LEARN_MORE';
    };

    // Validate single ad
    const isAdValid = (ad: AdCreative): boolean => {
        const hasMedia = !!ad.file || !!ad.existingImageUrl;
        const hasTitle = ad.title.length > 0 && ad.title.length <= 40;
        const hasBody = ad.body.length >= 20;
        // WhatsApp and Calls don't need URL or form - they use page contact info
        const hasDestination = isLeadForm ? !!ad.leadFormId : (needsUrl ? !!ad.link : true);

        return hasMedia && hasTitle && hasBody && hasDestination;
    };

    // At least one valid ad
    const hasValidAd = state.ads.some(isAdValid);

    const addAd = () => {
        if (state.ads.length < MAX_ADS) {
            const newAd: AdCreative = {
                id: crypto.randomUUID(),
                title: '',
                body: '',
                cta: getDefaultCTA(),
                link: '',
                file: null,
                previewUrl: null,
                leadFormId: ''
            };
            dispatch({ type: 'ADD_AD', ad: newAd });
        }
    };

    const duplicateAd = (adId: string) => {
        if (state.ads.length < MAX_ADS) {
            dispatch({ type: 'DUPLICATE_AD', id: adId });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-200">{t('wizard.step_3_title')}</h2>
                <span className="text-sm text-gray-400">
                    {state.ads.length}/{MAX_ADS} {t('wizard_simple.max_ads') || 'ads'}
                </span>
            </div>

            {/* Ad Cards */}
            <div className="space-y-4">
                {state.ads.map((ad, index) => (
                    <div key={ad.id} className="relative">
                        <AdCard
                            ad={ad}
                            index={index}
                            canRemove={state.ads.length > 1}
                            t={t}
                            locale={locale}
                            pageId={pageId}
                            accountId={accountId}
                        />
                        {/* Duplicate button */}
                        {state.ads.length < MAX_ADS && (
                            <button
                                type="button"
                                onClick={() => duplicateAd(ad.id)}
                                className="absolute top-4 right-12 text-gray-500 hover:text-blue-400 transition-colors"
                                title={t('wizard_simple.duplicate_ad') || 'Duplicate Ad'}
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Another Ad Button */}
            {state.ads.length < MAX_ADS && (
                <button
                    type="button"
                    onClick={addAd}
                    className="w-full py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    {t('wizard_simple.add_another_ad') || 'Add Another Ad'}
                </button>
            )}

            {/* Validation Summary */}
            <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                <p className="text-sm font-bold text-gray-400 mb-3">{t('wizard.quality_check')}</p>
                <div className="space-y-2">
                    {state.ads.map((ad, index) => {
                        const valid = isAdValid(ad);
                        return (
                            <div key={ad.id} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                    valid ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'
                                }`}>
                                    {valid ? (
                                        <CheckCircle className="w-3 h-3" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                    )}
                                </div>
                                <span className={valid ? 'text-green-400 text-sm' : 'text-gray-500 text-sm'}>
                                    Ad {index + 1}: {valid ? 'Ready' : 'Incomplete'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <WizardNavigation
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                canProceed={hasValidAd}
                backLabel={t('common.back') || 'Back'}
                submitLabel={t('wizard_simple.launch_campaign') || 'Launch Campaign'}
            />
        </div>
    );
}
