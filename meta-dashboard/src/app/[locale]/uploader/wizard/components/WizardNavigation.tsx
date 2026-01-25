"use client";

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useWizard } from './WizardContext';

interface Props {
    onBack?: () => void;
    onNext?: () => void;
    onSubmit?: () => void;
    isSubmitting?: boolean;
    canProceed?: boolean;
    nextLabel?: string;
    backLabel?: string;
    submitLabel?: string;
}

export default function WizardNavigation({
    onBack,
    onNext,
    onSubmit,
    isSubmitting = false,
    canProceed = true,
    nextLabel = 'Next',
    backLabel = 'Back',
    submitLabel = 'Launch Campaign'
}: Props) {
    const { state, dispatch } = useWizard();
    const isFirstStep = state.currentStep === 1;
    const isLastStep = state.currentStep === 7;

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (!isFirstStep) {
            dispatch({ type: 'SET_STEP', step: (state.currentStep - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 });
        }
    };

    const handleNext = () => {
        if (isLastStep && onSubmit) {
            onSubmit();
        } else if (onNext) {
            onNext();
        } else if (!isLastStep) {
            dispatch({ type: 'SET_STEP', step: (state.currentStep + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 });
        }
    };

    return (
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-800">
            {/* Back button */}
            {!isFirstStep ? (
                <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {backLabel}
                </button>
            ) : (
                <div />
            )}

            {/* Next/Submit button */}
            <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || isSubmitting}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLastStep
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-accent hover:bg-accent/80 text-white'
                }`}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                    </>
                ) : (
                    isLastStep ? submitLabel : nextLabel
                )}
            </button>
        </div>
    );
}
