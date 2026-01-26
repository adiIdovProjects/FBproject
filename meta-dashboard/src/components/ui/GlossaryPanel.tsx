'use client';

import React, { useState, useMemo } from 'react';
import { X, HelpCircle, Search } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const CATEGORY_ORDER = ['metrics', 'campaign_structure', 'targeting', 'creatives'] as const;

const TERM_KEYS = [
  'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'conversions', 'cpa', 'roas', 'conversion_rate',
  'campaign', 'adset', 'ad',
  'lookalike', 'custom_audience', 'broad_targeting',
  'hook_rate', 'hold_rate', 'fatigue'
] as const;

export const GlossaryPanel: React.FC = () => {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const allTerms = useMemo(() => {
    return TERM_KEYS.map(key => ({
      key,
      name: t(`glossary.terms.${key}.name`),
      category: t(`glossary.terms.${key}.category`),
      definition: t(`glossary.terms.${key}.definition`),
    }));
  }, [t]);

  const filteredTerms = useMemo(() => {
    if (!searchQuery.trim()) return allTerms;
    const query = searchQuery.toLowerCase();
    return allTerms.filter(term =>
      term.name.toLowerCase().includes(query) ||
      term.definition.toLowerCase().includes(query)
    );
  }, [allTerms, searchQuery]);

  const groupedTerms = useMemo(() => {
    const groups: Record<string, typeof filteredTerms> = {};
    CATEGORY_ORDER.forEach(cat => { groups[cat] = []; });

    filteredTerms.forEach(term => {
      if (groups[term.category]) {
        groups[term.category].push(term);
      }
    });

    return groups;
  }, [filteredTerms]);

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-6 ${isRTL ? 'left-6' : 'right-6'} z-40 w-10 h-10 rounded-full bg-accent hover:bg-accent-hover text-accent-text shadow-lg hover:shadow-xl transition-all flex items-center justify-center`}
        title={t('glossary.title')}
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {/* Panel Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className={`fixed top-0 bottom-0 ${isRTL ? 'left-0' : 'right-0'} w-96 max-w-[90vw] bg-card border-${isRTL ? 'r' : 'l'} border-border-subtle shadow-2xl z-50 flex flex-col`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b border-border-subtle ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <HelpCircle className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold text-foreground">{t('glossary.title')}</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border-subtle">
              <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 text-text-muted`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('glossary.search_placeholder')}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-secondary/50 border border-border-subtle rounded-xl text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>

            {/* Terms List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {filteredTerms.length === 0 ? (
                <p className="text-center text-text-muted py-8">{t('glossary.no_results')}</p>
              ) : (
                CATEGORY_ORDER.map(category => {
                  const terms = groupedTerms[category];
                  if (terms.length === 0) return null;

                  return (
                    <div key={category}>
                      <h3 className={`text-xs font-bold uppercase tracking-wider text-accent mb-3 ${isRTL ? 'text-right' : ''}`}>
                        {t(`glossary.categories.${category}`)}
                      </h3>
                      <div className="space-y-3">
                        {terms.map(term => (
                          <div
                            key={term.key}
                            className="p-3 bg-secondary/30 rounded-xl border border-border-subtle"
                            dir={isRTL ? 'rtl' : 'ltr'}
                          >
                            <p className="font-semibold text-foreground text-sm">{term.name}</p>
                            <p className="text-text-muted text-xs mt-1 leading-relaxed">{term.definition}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default GlossaryPanel;
