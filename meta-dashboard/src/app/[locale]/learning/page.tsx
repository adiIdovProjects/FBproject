"use client";

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '@/components/MainLayout';
import {
    ChevronDown,
    ChevronRight,
    Layers,
    Target,
    Sparkles,
    Activity,
    ExternalLink,
    Lightbulb,
    Youtube
} from 'lucide-react';

interface SectionProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    isRTL?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, description, icon, children, defaultOpen = false, isRTL = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const closedChevronClass = isRTL ? 'rotate-180' : '';

    return (
        <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center gap-4 p-5 hover:bg-white/5 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                    {icon}
                </div>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <p className="text-sm text-gray-400">{description}</p>
                </div>
                {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronRight className={`w-5 h-5 text-gray-400 ${closedChevronClass}`} />
                )}
            </button>
            {isOpen && (
                <div className="px-5 pb-5 border-t border-white/5">
                    <div className={`pt-5 ${isRTL ? 'text-right' : ''}`}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

const StepItem: React.FC<{ number: number; children: React.ReactNode }> = ({ number, children }) => (
    <div className="flex gap-3 rtl-reverse">
        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-xs font-bold text-accent">
            {number}
        </div>
        <p className="text-gray-300">{children}</p>
    </div>
);

const TipBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 rtl-reverse">
        <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
        <span>{children}</span>
    </div>
);

const QuestionItem: React.FC<{ question: string; children: React.ReactNode; isRTL?: boolean }> = ({ question, children, isRTL = false }) => {
    const [isOpen, setIsOpen] = useState(false);

    const closedChevronClass = isRTL ? 'rotate-180' : '';

    return (
        <div className="border border-white/10 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
            >
                {isRTL && (
                    isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                        <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 ${closedChevronClass}`} />
                    )
                )}
                <h4 className={`flex-1 font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}>{question}</h4>
                {!isRTL && (
                    isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    )
                )}
            </button>
            {isOpen && (
                <div className="px-4 pb-4 border-t border-white/10">
                    <div className={`pt-4 space-y-3 ${isRTL ? 'text-right' : ''}`}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function LearningCenterPage() {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';

    // YouTube search queries based on language
    const getYoutubeSearchUrl = (query: string) => {
        return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    };

    const pixelYoutubeUrl = getYoutubeSearchUrl(t('learning.pixel_youtube_query'));
    const leadYoutubeUrl = getYoutubeSearchUrl(t('learning.lead_youtube_query'));

    return (
        <MainLayout
            title={t('learning.title')}
            description={t('learning.subtitle')}
        >
            <div className="space-y-4 max-w-4xl">
                {/* Section 1: Facebook Ads Structure */}
                <Section
                    title={t('learning.ads_structure')}
                    description={t('learning.ads_structure_desc')}
                    icon={<Layers className="w-5 h-5 text-accent" />}
                    isRTL={isRTL}
                >
                    <div className="flex flex-col items-center gap-3 py-2">
                        <div className="w-full max-w-md p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <p className="font-bold text-purple-300 text-center">Campaign</p>
                            <p className="text-gray-300 text-sm text-center mt-1">{t('learning.campaign_definition')}</p>
                        </div>
                        <div className="w-px h-4 bg-gray-600"></div>
                        <div className="w-full max-w-md p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <p className="font-bold text-blue-300 text-center">Ad Set</p>
                            <p className="text-gray-300 text-sm text-center mt-1">{t('learning.adset_definition')}</p>
                        </div>
                        <div className="w-px h-4 bg-gray-600"></div>
                        <div className="w-full max-w-md p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                            <p className="font-bold text-green-300 text-center">Ad</p>
                            <p className="text-gray-300 text-sm text-center mt-1">{t('learning.ad_definition')}</p>
                        </div>
                    </div>
                </Section>

                {/* Section 2: Best Practices */}
                <Section
                    title={t('learning.best_practices')}
                    description={t('learning.best_practices_desc')}
                    icon={<Sparkles className="w-5 h-5 text-accent" />}
                    isRTL={isRTL}
                >
                    <div className="space-y-3">
                        <QuestionItem question={t('learning.objective_title')} isRTL={isRTL}>
                            <p className="text-gray-300 text-sm">{t('learning.objective_tip')}</p>
                            <TipBox>{t('learning.objective_tip_box')}</TipBox>
                        </QuestionItem>

                        <QuestionItem question={t('learning.ads_per_adset_title')} isRTL={isRTL}>
                            <p className="text-gray-300 text-sm">{t('learning.ads_per_adset')}</p>
                            <TipBox>{t('learning.ads_per_adset_tip')}</TipBox>
                        </QuestionItem>

                        <QuestionItem question={t('learning.campaign_vs_adset_title')} isRTL={isRTL}>
                            <p className="text-gray-300 text-sm">{t('learning.new_campaign_vs_adset')}</p>
                        </QuestionItem>

                        <QuestionItem question={t('learning.budget_title')} isRTL={isRTL}>
                            <div className="space-y-2 text-sm">
                                <p className="text-gray-300"><span className="text-green-400 font-medium">Testing:</span> {t('learning.budget_testing')}</p>
                                <p className="text-gray-300"><span className="text-blue-400 font-medium">Scaling:</span> {t('learning.budget_scaling')}</p>
                            </div>
                        </QuestionItem>

                        <QuestionItem question={t('learning.when_to_pause_title')} isRTL={isRTL}>
                            <p className="text-gray-300 text-sm">{t('learning.when_to_pause')}</p>
                        </QuestionItem>
                    </div>
                </Section>

                {/* Section 3: Pixel Setup */}
                <Section
                    title={t('learning.pixel_setup')}
                    description={t('learning.pixel_setup_desc')}
                    icon={<Activity className="w-5 h-5 text-accent" />}
                    isRTL={isRTL}
                >
                    <div className="space-y-4">
                        <p className="text-gray-400 text-sm mb-4">
                            {t('learning.pixel_intro')}
                        </p>

                        <div className="space-y-3">
                            <StepItem number={1}>{t('learning.pixel_step_1')}</StepItem>
                            <StepItem number={2}>{t('learning.pixel_step_2')}</StepItem>
                            <StepItem number={3}>{t('learning.pixel_step_3')}</StepItem>
                            <StepItem number={4}>{t('learning.pixel_step_4')}</StepItem>
                            <StepItem number={5}>{t('learning.pixel_step_5')}</StepItem>
                        </div>

                        <div className="flex flex-wrap gap-3 mt-4">
                            <a
                                href="https://business.facebook.com/events_manager"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-lg text-accent text-sm font-medium transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                {t('learning.pixel_link')}
                            </a>
                            <a
                                href={pixelYoutubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors"
                            >
                                <Youtube className="w-4 h-4" />
                                {t('learning.pixel_youtube')}
                            </a>
                        </div>
                    </div>
                </Section>

                {/* Section 4: Lead Form Setup */}
                <Section
                    title={t('learning.lead_forms')}
                    description={t('learning.lead_forms_desc')}
                    icon={<Target className="w-5 h-5 text-accent" />}
                    isRTL={isRTL}
                >
                    <div className="space-y-4">
                        <p className="text-gray-400 text-sm mb-4">
                            {t('learning.lead_intro')}
                        </p>

                        <div className="space-y-3">
                            <StepItem number={1}>{t('learning.lead_step_1')}</StepItem>
                            <StepItem number={2}>{t('learning.lead_step_2')}</StepItem>
                            <StepItem number={3}>{t('learning.lead_step_3')}</StepItem>
                            <StepItem number={4}>{t('learning.lead_step_4')}</StepItem>
                            <StepItem number={5}>{t('learning.lead_step_5')}</StepItem>
                            <StepItem number={6}>{t('learning.lead_step_6')}</StepItem>
                        </div>

                        <TipBox>{t('learning.higher_intent_tip')}</TipBox>

                        <div className="flex flex-wrap gap-3 mt-4">
                            <a
                                href="https://www.facebook.com/adsmanager/creation"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-lg text-accent text-sm font-medium transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                {t('learning.lead_link')}
                            </a>
                            <a
                                href={leadYoutubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors"
                            >
                                <Youtube className="w-4 h-4" />
                                {t('learning.lead_youtube')}
                            </a>
                        </div>
                    </div>
                </Section>

            </div>
        </MainLayout>
    );
}
