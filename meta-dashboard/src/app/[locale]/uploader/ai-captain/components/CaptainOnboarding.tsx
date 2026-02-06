"use client";

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Target, Users, Image, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CaptainOnboardingProps {
  onComplete: () => void;
}

const ONBOARDING_STORAGE_KEY = 'captain_onboarding_completed';

// Check if onboarding was completed
export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
}

// Mark onboarding as completed
export function markOnboardingCompleted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}

export const CaptainOnboarding: React.FC<CaptainOnboardingProps> = ({ onComplete }) => {
  const t = useTranslations();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <Target className="w-8 h-8 text-amber-400" />,
      title: t('captain.onboarding_step1_title'),
      description: t('captain.onboarding_step1_desc'),
    },
    {
      icon: <Users className="w-8 h-8 text-blue-400" />,
      title: t('captain.onboarding_step2_title'),
      description: t('captain.onboarding_step2_desc'),
    },
    {
      icon: <Image className="w-8 h-8 text-pink-400" />,
      title: t('captain.onboarding_step3_title'),
      description: t('captain.onboarding_step3_desc'),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      markOnboardingCompleted();
      onComplete();
    }
  };

  const handleSkip = () => {
    markOnboardingCompleted();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-semibold">{t('captain.onboarding_welcome')}</span>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step content */}
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            {steps[currentStep].icon}
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">
            {steps[currentStep].title}
          </h3>
          <p className="text-gray-400">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-amber-400' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-800 flex justify-between">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            {t('captain.onboarding_skip')}
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {currentStep < steps.length - 1 ? t('common.next') : t('captain.onboarding_start')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaptainOnboarding;
