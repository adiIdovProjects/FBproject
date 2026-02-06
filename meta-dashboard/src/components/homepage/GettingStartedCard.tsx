"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@tremor/react';
import { Lightbulb, X, BookOpen, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const STORAGE_KEY = 'adsai_getting_started_dismissed';

interface GettingStartedCardProps {
  locale: string;
}

const GettingStartedCard: React.FC<GettingStartedCardProps> = ({ locale }) => {
  const t = useTranslations('getting_started');
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    // Check localStorage on mount
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  const tips = [
    { key: 'tip_1', text: t('tip_1') },
    { key: 'tip_2', text: t('tip_2') },
    { key: 'tip_3', text: t('tip_3') },
  ];

  return (
    <Card className="card-gradient border-border-subtle border-accent/20 relative overflow-hidden">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-white font-bold text-base">{t('title')}</h3>
        </div>

        {/* Tips list */}
        <ul className="space-y-2 mb-4">
          {tips.map((tip) => (
            <li key={tip.key} className="flex items-start gap-2 text-sm text-gray-300">
              <ChevronRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <span>{tip.text}</span>
            </li>
          ))}
        </ul>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <Link
            href={`/${locale}/learning`}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {t('learn_more')}
          </Link>
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {t('dismiss')}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default GettingStartedCard;
