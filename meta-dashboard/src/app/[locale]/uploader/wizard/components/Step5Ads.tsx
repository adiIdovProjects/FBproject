"use client";

import { Plus, Copy } from 'lucide-react';
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
        const hasBody = ad.body.length > 0;
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
                    <div key={ad.id}>
                        <AdCard
                            ad={ad}
                            index={index}
                            canRemove={state.ads.length > 1}
                            t={t}
                            locale={locale}
                            pageId={pageId}
                            accountId={accountId}
                        />
                    </div>
                ))}
            </div>

            {/* Add New / Duplicate Ad Buttons */}
            {state.ads.length < MAX_ADS && (
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={addAd}
                        className="flex-1 py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-green-500 hover:text-green-400 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        {t('wizard_simple.add_new_ad') || 'Add New Ad'}
                    </button>
                    {state.ads.length > 0 && (
                        <button
                            type="button"
                            onClick={() => duplicateAd(state.ads[state.ads.length - 1].id)}
                            className="flex-1 py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                        >
                            <Copy className="w-5 h-5" />
                            {t('wizard_simple.duplicate_last_ad') || 'Duplicate Last Ad'}
                        </button>
                    )}
                </div>
            )}

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
