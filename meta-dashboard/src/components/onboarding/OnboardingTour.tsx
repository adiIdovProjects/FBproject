"use client";

/**
 * OnboardingTour Component
 * Simple spotlight-based tour for first-time users
 * Shows key features of the dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: 'onboarding_tour.step1_title',
    content: 'onboarding_tour.step1_content',
    position: 'right',
  },
  {
    target: '[data-tour="kpi-cards"]',
    title: 'onboarding_tour.step2_title',
    content: 'onboarding_tour.step2_content',
    position: 'bottom',
  },
  {
    target: '[data-tour="ai-button"]',
    title: 'onboarding_tour.step3_title',
    content: 'onboarding_tour.step3_content',
    position: 'left',
  },
  {
    target: '[data-tour="create-campaign"]',
    title: 'onboarding_tour.step4_title',
    content: 'onboarding_tour.step4_content',
    position: 'right',
  },
];

const STORAGE_KEY = 'adstyr_onboarding_completed';

export default function OnboardingTour() {
  const t = useTranslations();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Check if tour should show on mount
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Delay to let page render
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Find and highlight current step target
  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];
    const element = document.querySelector(step.target);

    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Skip to next step if element not found
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [isActive, currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
  }, []);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'skipped');
    setIsActive(false);
  }, []);

  if (!isActive || !targetRect) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    switch (step.position) {
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + padding,
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case 'top':
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      default:
        return { top: 0, left: 0 };
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - 8}
              y={targetRect.top - 8}
              width={targetRect.width + 16}
              height={targetRect.height + 16}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border */}
      <div
        className="absolute border-2 border-accent rounded-xl pointer-events-none animate-pulse"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute w-80 bg-card border border-border-subtle rounded-2xl shadow-2xl p-5"
        style={getTooltipStyle()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{t(step.title)}</h3>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-text-muted leading-relaxed mb-4">
          {t(step.content)}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentStep ? 'bg-accent' : 'bg-secondary'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-muted hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.back')}
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text text-sm font-medium rounded-lg transition-colors"
          >
            {isLastStep ? t('onboarding_tour.finish') : t('common.next')}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
