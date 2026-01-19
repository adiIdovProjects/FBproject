'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Search, Sparkles, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { queryAIInvestigator } from '../../services/ai.service';
import ReactMarkdown from 'react-markdown';
import { useTranslations, useLocale } from 'next-intl';

const DEFAULT_QUESTIONS = [
    "ai_investigator.questions.compare_weeks",
    "ai_investigator.questions.best_ad",
    "ai_investigator.questions.ad_performance",
    "ai_investigator.questions.best_country_cpc",
    "ai_investigator.questions.spend_by_age",
    "ai_investigator.questions.ig_vs_feed",
    "ai_investigator.questions.avg_roas",
    "ai_investigator.questions.creative_effectiveness",
    "ai_investigator.questions.leads_overview"
];

export const AIInvestigator: React.FC = () => {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'he' || locale === 'ar';
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [response, loading, error]);

    const handleQuery = async (text: string, displayText?: string) => {
        if (!text.trim()) return;

        setLoading(true);
        setResponse(null);
        setError(null);
        // Use displayText for the input field if provided, otherwise use the query text
        setQuery(displayText || text);

        try {
            const result = await queryAIInvestigator(text);
            setResponse(result.answer);
        } catch (err: any) {
            setError(err.message || t('common.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col w-full max-w-4xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="text-center space-y-4 py-4">
                <h1 className="text-4xl font-black text-white tracking-tight flex items-center justify-center gap-3">
                    <Sparkles className="w-8 h-8 text-accent animate-pulse" />
                    {t('ai_investigator.center_title')}
                </h1>
                <p className="text-gray-400 text-lg max-w-lg mx-auto font-medium">
                    {t('ai_investigator.center_subtitle')}
                </p>
            </div>

            {/* Interaction Area (Search Bar) at the Top */}
            <div className="space-y-6">
                {/* Input Area */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
                    <div className="relative flex items-center bg-gray-900/80 backdrop-blur-xl border border-white/5 rounded-2xl p-2 focus-within:border-accent/50 shadow-2xl transition-all">
                        <Search className="w-6 h-6 text-gray-500 ml-4" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleQuery(query)}
                            placeholder={t('ai_investigator.placeholder')}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 px-4 py-3 text-lg font-medium"
                            disabled={loading}
                        />
                        <button
                            onClick={() => handleQuery(query)}
                            disabled={loading || !query.trim()}
                            className="bg-accent hover:bg-accent-light disabled:bg-gray-800 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center min-w-[56px]"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <Send className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative">
                                <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                                <Sparkles className="w-4 h-4 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                            </div>
                            <p className="text-gray-400 animate-pulse font-bold tracking-tight uppercase text-xs">{t('ai_investigator.investigating')}</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start space-x-4">
                        <AlertCircle className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
                        <div className="space-y-1">
                            <h3 className="text-red-400 font-bold text-lg">{t('ai_investigator.failed')}</h3>
                            <p className="text-red-400/80 font-medium">{error}</p>
                            <button
                                onClick={() => handleQuery(query)}
                                className="text-white bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-lg mt-4 text-sm font-bold transition-colors"
                            >
                                {t('common.try_again')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Default Questions Grid - Shown below if no response yet */}
                {!response && !loading && !error && (
                    <div className="space-y-4">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] px-2 text-center">{t('ai_investigator.suggested_questions')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {DEFAULT_QUESTIONS.map((q, idx) => {
                                const translatedQuestion = t(q as any);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleQuery(translatedQuestion, translatedQuestion)}
                                        className={`p-6 bg-white/5 border border-white/5 rounded-2xl hover:border-accent/40 hover:bg-white/10 transition-all group relative overflow-hidden active:scale-95 ${isRTL ? 'text-right' : 'text-left'}`}
                                    >
                                        <p className="text-gray-400 group-hover:text-white transition-colors leading-relaxed font-bold text-sm">
                                            {translatedQuestion}
                                        </p>
                                        <div className={`mt-4 flex items-center text-accent text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            {t('ai_investigator.ask_sol')} <ChevronRight className={`w-3 h-3 ${isRTL ? 'mr-1 rotate-180' : 'ml-1'}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Response Area */}
                {response && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all" ref={scrollRef}>
                        <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Sparkles className="w-4 h-4 text-accent" />
                                <span className="text-xs font-black uppercase tracking-widest text-gray-400">{t('ai_investigator.gemini_analysis')}</span>
                            </div>
                            <button
                                onClick={() => { setResponse(null); setQuery(''); }}
                                className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                            >
                                {t('common.clear')}
                            </button>
                        </div>
                        <div className="p-8 prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-strong:text-accent prose-blockquote:border-accent prose-li:text-gray-300">
                            <ReactMarkdown>{response}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
