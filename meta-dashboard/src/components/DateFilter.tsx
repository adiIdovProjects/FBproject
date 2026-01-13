// components/DateFilter.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ChevronDown, Clock, X, SlidersHorizontal } from 'lucide-react';

// *** ייבוא מעודכן מ-utils/date.ts ***
import { formatDate, calculateDateRange } from '../utils/date';
// *** ייבוא מעודכן מ-constants/app.ts ***
import { QUICK_SELECT_OPTIONS, DEFAULT_DATE_RANGE_KEY, QuickSelectKey } from '../constants/app';

import { useTranslations } from 'next-intl';

// ----------------------------------------------------------------------
// 1. TYPESCRIPT INTERFACES
// ----------------------------------------------------------------------

interface DateFilterProps {
    startDate: string | null;
    endDate: string | null;
    onDateRangeChange: (startDate: string | null, endDate: string | null) => void;

    // Props שהועברו מה-Page הראשי לצורך תרגום ו-RTL
    lang?: string;
    isRTL?: boolean;
    t?: any; // Keep for compatibility but use hook internally
}

// ----------------------------------------------------------------------
// 2. DATE FILTER COMPONENT (EXPORT DEFAULT)
// ----------------------------------------------------------------------

const DateFilter: React.FC<DateFilterProps> = ({
    onDateRangeChange,
    isRTL: propIsRTL,
    startDate: externalStartDate,
    endDate: externalEndDate,
}) => {
    const t = useTranslations();
    const isRTL = propIsRTL !== undefined ? propIsRTL : false;

    // קובע את טווח ברירת המחדל
    const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);

    const [selectedKey, setSelectedKey] = useState<QuickSelectKey>(DEFAULT_DATE_RANGE_KEY);
    const [isOpen, setIsOpen] = useState(false);

    // מצב לטווח תאריכים מותאם אישית. 
    const [customStartDate, setCustomStartDate] = useState<string | null>(externalStartDate || formatDate(initialDates.start));
    const [customEndDate, setCustomEndDate] = useState<string | null>(externalEndDate || formatDate(initialDates.end));

    // *** פונקציית עזר לתרגום בטוח ***
    const tSafe = useCallback((key: string): string => {
        return t(key as any);
    }, [t]);


    // מחשב את טווח התאריכים הסופי ואת התווית המוצגת על הכפתור
    const { finalStartDate, finalEndDate, label } = useMemo(() => {
        let currentLabel: string;
        let start: Date | null = null;
        let end: Date | null = null;

        const option = QUICK_SELECT_OPTIONS.find(opt => opt.key === selectedKey);

        if (selectedKey === 'custom') {
            currentLabel = t('date.custom');
            return { finalStartDate: customStartDate, finalEndDate: customEndDate, label: currentLabel };
        }

        currentLabel = option ? t(`date.${option.key}`) : t(`date.${DEFAULT_DATE_RANGE_KEY}`);

        const calculated = calculateDateRange(selectedKey);
        start = calculated.start;
        end = calculated.end;

        return {
            finalStartDate: formatDate(start),
            finalEndDate: formatDate(end),
            label: currentLabel
        };
    }, [selectedKey, customStartDate, customEndDate, tSafe]);

    // מפעיל את ה-callback לאחזור נתונים ב-Page הראשי
    useEffect(() => {
        if (finalStartDate && finalEndDate) {
            onDateRangeChange(finalStartDate, finalEndDate);
        } else {
            onDateRangeChange(null, null); // אם לא חוקי, שלח null
        }
    }, [finalStartDate, finalEndDate, onDateRangeChange]);

    const handleQuickSelect = useCallback((key: QuickSelectKey) => {
        setSelectedKey(key);
        setIsOpen(false);
        if (key !== 'custom') {
            const calculated = calculateDateRange(key);
            setCustomStartDate(formatDate(calculated.start));
            setCustomEndDate(formatDate(calculated.end));
        }
    }, []);

    // פונקציה לאיפוס לברירת המחדל
    const handleClear = useCallback(() => {
        handleQuickSelect(DEFAULT_DATE_RANGE_KEY);
    }, [handleQuickSelect]);

    /**
     * פונקציית עזר לעיצוב התאריך המוצג על הכפתור: DD-MM
     */
    const formatDisplayDate = (dateString: string | null): string => {
        if (!dateString) return t('date.select_range');
        try {
            const parts = dateString.split('-');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}`;
            }
            return dateString;
        } catch (e) {
            return dateString;
        }
    };

    const displayRange = `${formatDisplayDate(finalStartDate)} - ${formatDisplayDate(finalEndDate)}`;

    // קביעת כיווניות Tailwind
    const flexDirectionClass = isRTL ? 'space-x-reverse' : 'space-x-2';
    const alignTextClass = isRTL ? 'text-right' : 'text-left';
    const popoverPositionClass = isRTL ? 'right-0' : 'left-0';


    return (
        <div className="relative w-full md:w-auto z-50 font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* 1. Compact Main Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between px-3 py-2 bg-[#1e293b] text-white rounded-xl border border-border-subtle hover:border-accent/50 transition-all duration-300 shadow-lg group hover:bg-slate-700 min-w-[140px]"
            >
                <div className={`flex items-center space-x-2 ${flexDirectionClass} whitespace-nowrap`}>
                    <div className="p-1.5 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <span className="text-xs font-bold tracking-wide text-white">{label}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            {/* 2. Popover */}
            {isOpen && (
                <div
                    className={`absolute ${popoverPositionClass} mt-2 w-72 bg-[#0f172a] border border-border-subtle rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden border-glow z-[100]`}
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setIsOpen(false);
                        }
                    }}
                    tabIndex={-1}
                >
                    {/* Header with Date Range */}
                    <div className="p-4 flex flex-col bg-white/[0.03] border-b border-white/[0.05] gap-2">
                        <div className="flex justify-between items-center">
                            <p className={`text-accent font-bold uppercase tracking-widest flex items-center space-x-2 ${flexDirectionClass} text-[10px]`}>
                                <Clock className="w-3 h-3" />
                                <span>{t('date.selected_range')}</span>
                            </p>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="font-mono text-sm font-bold text-white tracking-tight">
                            {displayRange}
                        </div>
                    </div>

                    {/* Quick Select Grid */}
                    <div className="p-2 grid grid-cols-2 gap-2">
                        {QUICK_SELECT_OPTIONS.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => handleQuickSelect(opt.key)}
                                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-200 ${selectedKey === opt.key ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                {t(`date.${opt.key}`)}
                            </button>
                        ))}
                    </div>

                    {/* Custom Selection */}
                    <div className="p-4 border-t border-white/[0.05] bg-black/20">
                        <h4 className={`text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center space-x-2 ${flexDirectionClass} mb-3`}>
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>{t('date.custom')}</span>
                        </h4>
                        <div className="flex flex-col space-y-3">
                            <label className="flex flex-col text-[10px] font-bold text-gray-500 uppercase tracking-widest gap-1.5">
                                {t('date.start')}
                                <input
                                    type="date"
                                    value={customStartDate || ''}
                                    onChange={(e) => {
                                        setCustomStartDate(e.target.value);
                                        setSelectedKey('custom');
                                    }}
                                    className="p-2 border border-white/10 rounded-lg bg-black/40 text-white text-xs focus:border-accent focus:ring-0 transition-colors w-full outline-none font-mono placeholder-gray-500"
                                    dir="ltr"
                                />
                            </label>
                            <label className="flex flex-col text-[10px] font-bold text-gray-500 uppercase tracking-widest gap-1.5">
                                {t('date.end')}
                                <input
                                    type="date"
                                    value={customEndDate || ''}
                                    onChange={(e) => {
                                        setCustomEndDate(e.target.value);
                                        setSelectedKey('custom');
                                    }}
                                    className="p-2 border border-white/10 rounded-lg bg-black/40 text-white text-xs focus:border-accent focus:ring-0 transition-colors w-full outline-none font-mono placeholder-gray-500"
                                    dir="ltr"
                                />
                            </label>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};


export default DateFilter;