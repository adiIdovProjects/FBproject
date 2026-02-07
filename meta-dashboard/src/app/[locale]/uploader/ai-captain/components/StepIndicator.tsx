"use client";

import React from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCaptain, CaptainState } from './CaptainContext';

// Helper to check if a step has data filled
const hasStepData = (stepId: string, state: CaptainState): boolean => {
    const currentAd = state.ads[state.currentAdIndex];
    switch (stepId) {
        case 'welcome': return !!state.objective;
        case 'lead_type': return !!state.leadType;
        case 'campaign_name': return !!state.campaignName;
        case 'budget': return state.dailyBudget > 0;
        case 'location': return state.selectedLocations.length > 0;
        case 'targeting_type': return !!state.targetingType;
        case 'audiences': return state.selectedAudiences.length > 0 || state.targetingType === 'advantage';
        case 'interests': return state.selectedInterests.length > 0 || state.targetingType === 'advantage';
        case 'age': return state.ageMin !== 18 || state.ageMax !== 65; // Has been set if changed from defaults
        case 'gender': return !!state.gender;
        case 'platform': return !!state.platform;
        case 'creative': return !!currentAd?.file || !!currentAd?.previewUrl;
        case 'headline': return !!currentAd?.title;
        case 'body': return !!currentAd?.body;
        case 'link': return !!currentAd?.link;
        case 'cta': return !!currentAd?.cta;
        default: return false;
    }
};

// Helper to get the filled value for display
const getStepValue = (stepId: string, state: CaptainState): string | null => {
    const currentAd = state.ads[state.currentAdIndex];
    switch (stepId) {
        case 'welcome': return state.objective || null;
        case 'lead_type': return state.leadType || null;
        case 'campaign_name': return state.campaignName || null;
        case 'budget': return state.dailyBudget > 0 ? `$${state.dailyBudget}` : null;
        case 'location':
            if (state.selectedLocations.length === 0) return null;
            if (state.selectedLocations.length === 1) return state.selectedLocations[0].name;
            return `${state.selectedLocations.length} locations`;
        case 'targeting_type': return state.targetingType === 'advantage' ? 'Advantage+' : state.targetingType === 'custom' ? 'Custom' : null;
        case 'audiences':
            if (state.selectedAudiences.length === 0) return null;
            return `${state.selectedAudiences.length} audience${state.selectedAudiences.length > 1 ? 's' : ''}`;
        case 'interests':
            if (state.selectedInterests.length === 0) return null;
            return `${state.selectedInterests.length} interest${state.selectedInterests.length > 1 ? 's' : ''}`;
        case 'age': return `${state.ageMin}-${state.ageMax}`;
        case 'gender':
            if (state.gender === 'all') return 'All';
            if (state.gender === 'male') return 'Male';
            if (state.gender === 'female') return 'Female';
            return null;
        case 'platform':
            if (state.platform === 'all') return 'Both';
            if (state.platform === 'facebook') return 'Facebook';
            if (state.platform === 'instagram') return 'Instagram';
            return null;
        case 'headline': return currentAd?.title ? (currentAd.title.length > 20 ? currentAd.title.slice(0, 20) + '...' : currentAd.title) : null;
        case 'body': return currentAd?.body ? (currentAd.body.length > 20 ? currentAd.body.slice(0, 20) + '...' : currentAd.body) : null;
        case 'cta': return currentAd?.cta?.replace(/_/g, ' ') || null;
        default: return null;
    }
};

// Define all possible steps in order (budget moved after campaign_name)
const ALL_STEPS = [
    { id: 'welcome', labelKey: 'captain.step_objective' },
    { id: 'lead_type', labelKey: 'captain.step_lead_type', condition: (state: CaptainState) => state.objective === 'LEADS' },
    { id: 'campaign_name', labelKey: 'captain.step_campaign_name' },
    { id: 'budget', labelKey: 'captain.step_budget' },
    { id: 'location', labelKey: 'captain.step_location' },
    { id: 'targeting_type', labelKey: 'captain.step_targeting_type' },
    { id: 'audiences', labelKey: 'captain.step_audiences', condition: (state: CaptainState) => state.targetingType === 'custom' },
    { id: 'interests', labelKey: 'captain.step_interests', condition: (state: CaptainState) => state.targetingType === 'custom' },
    { id: 'age', labelKey: 'captain.step_age' },
    { id: 'gender', labelKey: 'captain.step_gender' },
    { id: 'platform', labelKey: 'captain.step_platform' },
    { id: 'creative', labelKey: 'captain.step_creative' },
    { id: 'headline', labelKey: 'captain.step_headline' },
    { id: 'body', labelKey: 'captain.step_body' },
    { id: 'link', labelKey: 'captain.step_link', condition: (state: CaptainState) =>
        state.objective !== 'WHATSAPP' && state.objective !== 'CALLS' && state.leadType !== 'FORM'
    },
    { id: 'cta', labelKey: 'captain.step_cta' },
];

interface StepIndicatorProps {
    className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ className = '' }) => {
    const t = useTranslations();
    const { state, dispatch } = useCaptain();

    // Filter steps based on conditions
    const visibleSteps = ALL_STEPS.filter(step =>
        !step.condition || step.condition(state)
    );

    // Find current step index
    const currentIndex = visibleSteps.findIndex(step => step.id === state.currentQuestionId);

    // Check which steps have data filled (not just in history)
    const stepsWithData = new Set(
        visibleSteps.filter(step => hasStepData(step.id, state)).map(step => step.id)
    );

    const handleStepClick = (stepId: string, stepIndex: number) => {
        // Can click any step that has data or is before current
        if (stepsWithData.has(stepId) || stepIndex < currentIndex) {
            dispatch({ type: 'GO_TO_STEP', questionId: stepId });
        }
    };

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {visibleSteps.map((step, index) => {
                const hasData = stepsWithData.has(step.id);
                const isCurrent = step.id === state.currentQuestionId;
                // Color bug fix: step is "completed" (green) if it has data, even if currently editing
                const isCompleted = hasData;
                const isFuture = index > currentIndex && !hasData;
                const isClickable = hasData || index < currentIndex;
                const stepValue = getStepValue(step.id, state);

                return (
                    <button
                        key={step.id}
                        onClick={() => handleStepClick(step.id, index)}
                        disabled={!isClickable}
                        className={`
                            flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all
                            ${isClickable ? 'cursor-pointer hover:bg-gray-800' : 'cursor-default'}
                            ${isCurrent ? 'bg-amber-500/20 border border-amber-500/50' : ''}
                            ${isFuture ? 'text-gray-600' : ''}
                        `}
                    >
                        {/* Step indicator circle - green if has data */}
                        <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0
                            ${isCompleted ? 'bg-green-500 text-white' : ''}
                            ${!isCompleted && isCurrent ? 'bg-amber-500 text-white' : ''}
                            ${isFuture ? 'bg-gray-700 text-gray-500' : ''}
                        `}>
                            {isCompleted ? (
                                <Check className="w-3 h-3" />
                            ) : (
                                index + 1
                            )}
                        </div>

                        {/* Step label and value */}
                        <div className="flex flex-col min-w-0">
                            <span className={`
                                text-sm truncate
                                ${isCurrent ? 'text-amber-400 font-medium' : ''}
                                ${isCompleted && !isCurrent ? 'text-gray-300' : ''}
                                ${isFuture ? 'text-gray-600' : ''}
                            `}>
                                {t(step.labelKey)}
                            </span>
                            {/* Show filled value */}
                            {stepValue && (
                                <span className="text-xs text-green-400 truncate">
                                    {stepValue}
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

// Mobile version - just shows step count
export const MobileStepIndicator: React.FC = () => {
    const t = useTranslations();
    const { state } = useCaptain();

    // Filter steps based on conditions
    const visibleSteps = ALL_STEPS.filter(step =>
        !step.condition || step.condition(state)
    );

    const currentIndex = visibleSteps.findIndex(step => step.id === state.currentQuestionId);
    const totalSteps = visibleSteps.length;
    const currentStep = currentIndex + 1;

    return (
        <div className="text-sm text-gray-400">
            {t('captain.step_x_of_y', { current: currentStep, total: totalSteps })}
        </div>
    );
};

export default StepIndicator;
