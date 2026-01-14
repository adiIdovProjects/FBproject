"use client";

import React, { useState } from 'react';
import { MessageSquare, Send, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { queryAIInvestigator } from '../../services/ai.service';

interface AIHelpPanelProps {
    accountId?: string | null;
}

const QUICK_QUESTIONS = [
    'ai_panel.q_high_cpa',
    'ai_panel.q_what_pause',
    'ai_panel.q_improve_ctr',
    'ai_panel.q_best_performing'
];

export function AIHelpPanel({ accountId }: AIHelpPanelProps) {
    const t = useTranslations();
    const [isExpanded, setIsExpanded] = useState(false);
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAsk = async (q: string) => {
        if (!q.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const result = await queryAIInvestigator(q);
            setResponse(result.response || result.answer || 'No response received');
        } catch (err) {
            console.error('AI query error:', err);
            setError(t('ai_panel.error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAsk(question);
    };

    const handleQuickQuestion = (key: string) => {
        const q = t(key);
        setQuestion(q);
        handleAsk(q);
    };

    return (
        <div className="mb-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-white text-sm">{t('ai_panel.title')}</h3>
                        <p className="text-xs text-gray-400">{t('ai_panel.subtitle')}</p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5">
                    {/* Quick questions */}
                    <div className="flex flex-wrap gap-2 mt-4 mb-4">
                        {QUICK_QUESTIONS.map((key) => (
                            <button
                                key={key}
                                onClick={() => handleQuickQuestion(key)}
                                disabled={isLoading}
                                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-300 transition-colors disabled:opacity-50"
                            >
                                {t(key)}
                            </button>
                        ))}
                    </div>

                    {/* Custom question input */}
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder={t('ai_panel.placeholder')}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !question.trim()}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </form>

                    {/* Response area */}
                    {(response || error || isLoading) && (
                        <div className="mt-4 p-4 bg-black/20 rounded-lg border border-white/5">
                            {isLoading && (
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('ai_panel.thinking')}
                                </div>
                            )}
                            {error && (
                                <p className="text-red-400 text-sm">{error}</p>
                            )}
                            {response && !isLoading && (
                                <div className="text-gray-300 text-sm whitespace-pre-wrap">
                                    {response}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
