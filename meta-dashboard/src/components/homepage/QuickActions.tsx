"use client";

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, BarChart3, Sparkles } from 'lucide-react';
import { useAIChat } from '@/context/AIChatContext';

const QuickActions: React.FC = () => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { openChat } = useAIChat();

  const navigateTo = (path: string) => {
    router.push(`/${locale}${path}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      {/* Create Campaign - Primary */}
      <button
        onClick={() => navigateTo('/create')}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg"
      >
        <Plus className="w-5 h-5" />
        {t('homepage2.actions.create')}
      </button>

      {/* View Performance - Secondary */}
      <button
        onClick={() => navigateTo('/performance')}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/15 transition-all hover:scale-[1.02]"
      >
        <BarChart3 className="w-5 h-5" />
        {t('homepage2.actions.performance')}
      </button>

      {/* Ask AI - Opens Chat */}
      <button
        onClick={() => openChat()}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg"
      >
        <Sparkles className="w-5 h-5" />
        {t('homepage2.actions.ask_ai')}
      </button>
    </div>
  );
};

export default QuickActions;
