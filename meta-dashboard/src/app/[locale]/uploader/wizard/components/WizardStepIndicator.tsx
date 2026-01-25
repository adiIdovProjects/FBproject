"use client";

import { useWizard } from './WizardContext';

interface Props {
    stepLabels: string[];
}

export default function WizardStepIndicator({ stepLabels }: Props) {
    const { state } = useWizard();
    const totalSteps = 7;

    return (
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
            <div className="flex gap-1.5">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
                    <div
                        key={step}
                        className={`w-8 h-1.5 rounded-full transition-colors ${
                            state.currentStep >= step ? 'bg-accent' : 'bg-gray-700'
                        }`}
                    />
                ))}
            </div>
            <span className="text-sm text-gray-400">
                {stepLabels[state.currentStep - 1] || `Step ${state.currentStep} of ${totalSteps}`}
            </span>
        </div>
    );
}
