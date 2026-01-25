"use client";

import { useWizard } from './WizardContext';
import WizardNavigation from './WizardNavigation';
import {
    Target, MapPin, Users, DollarSign, Image, ChevronRight, Loader2
} from 'lucide-react';

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
    isSubmitting: boolean;
    onSubmit: () => void;
}

export default function StepReview({ t, isSubmitting, onSubmit }: Props) {
    const { state, dispatch } = useWizard();

    // Helper to format objective
    const getObjectiveLabel = (): string => {
        const objectiveMap: Record<string, string> = {
            'SALES': t('wizard.objective_sales') || 'Sales',
            'LEADS': t('wizard.objective_leads') || 'Leads',
            'TRAFFIC': t('wizard.objective_traffic') || 'Traffic',
            'ENGAGEMENT': t('wizard.objective_engagement') || 'Engagement',
            'WHATSAPP': t('wizard.objective_whatsapp') || 'WhatsApp',
            'CALLS': t('wizard.objective_calls') || 'Calls',
        };
        return objectiveMap[state.objective || ''] || state.objective || 'Not selected';
    };

    // Helper to format location summary
    const getLocationSummary = () => {
        const locations = state.selectedLocations.map(l => l.display_name || l.name);
        const pins = state.customPins.map(p => p.name);
        const all = [...locations, ...pins];
        if (all.length === 0) return t('wizard.no_locations') || 'No locations selected';
        if (all.length <= 3) return all.join(', ');
        return `${all.slice(0, 2).join(', ')} +${all.length - 2} more`;
    };

    // Helper to format targeting summary
    const getTargetingSummary = () => {
        if (state.audienceMode === 'advantage_plus') {
            return t('wizard.advantage_plus') || 'Advantage+ (AI Optimized)';
        }
        const parts = [];
        parts.push(`${state.ageMin}-${state.ageMax}`);
        if (state.gender !== 'all') parts.push(state.gender);
        if (state.platform !== 'all') parts.push(state.platform);
        if (state.selectedAudiences.length > 0) parts.push(`${state.selectedAudiences.length} audiences`);
        if (state.selectedInterests.length > 0) parts.push(`${state.selectedInterests.length} interests`);
        return parts.join(' · ');
    };

    // Helper to get valid ads count
    const getValidAdsCount = () => {
        return state.ads.filter(ad => {
            // Existing posts are already complete
            if (ad.useExistingPost && ad.objectStoryId) return true;
            // New ads need media, title, and body
            const hasMedia = !!ad.file || !!ad.existingImageUrl;
            const hasTitle = ad.title.length > 0;
            const hasBody = ad.body.length > 0;
            return hasMedia && hasTitle && hasBody;
        }).length;
    };

    // Section component for consistency
    const ReviewSection = ({
        icon: Icon,
        title,
        value,
        step,
        color = 'blue'
    }: {
        icon: React.ComponentType<{ className?: string }>;
        title: string;
        value: string;
        step: number;
        color?: string;
    }) => (
        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${color}-500/20`}>
                    <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
                <div>
                    <p className="text-sm text-gray-400">{title}</p>
                    <p className="font-medium text-white">{value}</p>
                </div>
            </div>
            <button
                onClick={() => dispatch({ type: 'SET_STEP', step: step as 1 | 2 | 3 | 4 | 5 | 6 | 7 })}
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
                {t('common.edit') || 'Edit'}
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-200">
                    {t('wizard.review_title') || 'Review Your Campaign'}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                    {t('wizard.review_desc') || 'Make sure everything looks good before launching'}
                </p>
            </div>

            {/* Campaign Name */}
            {state.campaignName && (
                <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/30">
                    <p className="text-sm text-gray-400">{t('wizard.campaign_name') || 'Campaign Name'}</p>
                    <p className="text-lg font-bold text-white">{state.campaignName}</p>
                </div>
            )}

            {/* Review Sections */}
            <div className="space-y-3">
                <ReviewSection
                    icon={Target}
                    title={t('wizard.objective') || 'Objective'}
                    value={getObjectiveLabel()}
                    step={1}
                />

                <ReviewSection
                    icon={MapPin}
                    title={t('wizard.locations') || 'Locations'}
                    value={getLocationSummary()}
                    step={3}
                    color="green"
                />

                <ReviewSection
                    icon={Users}
                    title={t('wizard.targeting') || 'Targeting'}
                    value={getTargetingSummary()}
                    step={4}
                    color="purple"
                />

                <ReviewSection
                    icon={DollarSign}
                    title={t('wizard.daily_budget') || 'Daily Budget'}
                    value={`$${state.dailyBudget}/day`}
                    step={5}
                    color="yellow"
                />

                <ReviewSection
                    icon={Image}
                    title={t('wizard.ads') || 'Ads'}
                    value={`${getValidAdsCount()} ad${getValidAdsCount() !== 1 ? 's' : ''} ready`}
                    step={6}
                    color="pink"
                />
            </div>

            {/* Schedule Info */}
            {state.useSchedule && (state.startDate || state.endDate) && (
                <div className="p-3 bg-gray-800/30 rounded-lg text-sm text-gray-400">
                    {state.startDate && <span>Starts: {state.startDate}</span>}
                    {state.startDate && state.endDate && <span className="mx-2">·</span>}
                    {state.endDate && <span>Ends: {state.endDate}</span>}
                </div>
            )}

            {/* Important Note */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-300">
                    <strong>{t('wizard.note') || 'Note'}:</strong>{' '}
                    {t('wizard.campaign_starts_paused') || 'Your campaign will start in PAUSED status. You can activate it from the Manage page after reviewing.'}
                </p>
            </div>

            {/* Submit Button */}
            <WizardNavigation
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                canProceed={getValidAdsCount() > 0}
                backLabel={t('common.back') || 'Back'}
                submitLabel={t('wizard.launch_campaign') || 'Launch Campaign'}
            />
        </div>
    );
}
