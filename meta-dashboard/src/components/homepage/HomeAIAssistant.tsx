"use client";

/**
 * HomeAIAssistant Component
 * Prominent AI entry point featuring Eddie, the ads captain
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Text } from '@tremor/react';
import { Bot, Send, Sparkles, HelpCircle, TrendingUp, Lightbulb } from 'lucide-react';

interface HomeAIAssistantProps {
  onOpenChat: (initialMessage?: string) => void;
  hasActiveCampaigns?: boolean;
  hasIssues?: boolean;
}

// Get time-based greeting
function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'greeting_morning';
  if (hour < 18) return 'greeting_afternoon';
  return 'greeting_evening';
}

const HomeAIAssistant: React.FC<HomeAIAssistantProps> = ({
  onOpenChat,
  hasActiveCampaigns = true,
  hasIssues = false,
}) => {
  const t = useTranslations();
  const [inputValue, setInputValue] = useState('');

  // Contextual quick questions based on account state
  const getQuickQuestions = () => {
    if (!hasActiveCampaigns) {
      // New user questions
      return [
        { key: 'q_create_campaign', icon: Sparkles },
        { key: 'q_budget', icon: HelpCircle },
        { key: 'q_how_it_works', icon: Lightbulb },
      ];
    }

    if (hasIssues) {
      // User with issues
      return [
        { key: 'q_whats_wrong', icon: HelpCircle },
        { key: 'q_improve', icon: TrendingUp },
        { key: 'q_what_next', icon: Lightbulb },
      ];
    }

    // Active healthy user
    return [
      { key: 'q_how_doing', icon: TrendingUp },
      { key: 'q_what_next', icon: Lightbulb },
      { key: 'q_scale', icon: Sparkles },
    ];
  };

  const quickQuestions = getQuickQuestions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onOpenChat(inputValue.trim());
      setInputValue('');
    } else {
      onOpenChat();
    }
  };

  const handleQuickQuestion = (questionKey: string) => {
    const question = t(`homepage.ai_assistant.${questionKey}`);
    onOpenChat(question);
  };

  return (
    <Card className="card-gradient border-accent/30 p-6 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative">
        {/* Eddie avatar and greeting */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-accent to-purple-600 shadow-lg shadow-accent/20">
            <Bot className="w-8 h-8 text-white" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Text className="text-white font-bold text-lg">Eddie</Text>
              <span className="text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
                {t('homepage.ai_assistant.badge')}
              </span>
            </div>
            <Text className="text-gray-300">
              {t(`homepage.ai_assistant.${getGreetingKey()}`)}
            </Text>
            <Text className="text-gray-400 text-sm mt-1">
              {t('homepage.ai_assistant.tagline')}
            </Text>
          </div>
        </div>

        {/* Input field */}
        <form onSubmit={handleSubmit} className="mb-5">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 focus-within:border-accent/50 transition-colors">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('homepage.ai_assistant.placeholder')}
              className="flex-1 bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="p-3 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </form>

        {/* Quick questions */}
        <div>
          <Text className="text-gray-400 text-sm mb-3">
            {t('homepage.ai_assistant.try_these')}
          </Text>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleQuickQuestion(key)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 rounded-xl text-sm text-gray-300 hover:text-white transition-all"
              >
                <Icon className="w-4 h-4 text-accent" />
                <span>{t(`homepage.ai_assistant.${key}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HomeAIAssistant;
