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
            currentLabel = tSafe('custom');
            return { finalStartDate: customStartDate, finalEndDate: customEndDate, label: currentLabel };
        }

        currentLabel = option ? tSafe(option.labelKey) : tSafe(DEFAULT_DATE_RANGE_KEY);

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
        if (!dateString) return tSafe('select_date');
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
            {/* 1. כפתור Date Picker הראשי */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between px-5 py-3.5 bg-card-bg/50 backdrop-blur-xl text-gray-100 rounded-2xl border border-border-subtle hover:border-accent/50 transition-all duration-300 shadow-2xl w-72 group"
            >
                <div className={`flex items-center space-x-3 ${flexDirectionClass} whitespace-nowrap`}>
                    <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                        <Calendar className="w-4 h-4 text-accent" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">{label}</span>
                </div>
                <div className={`flex items-center text-xs font-bold text-gray-400 whitespace-nowrap ${flexDirectionClass}`}>
                    <span className="font-mono tracking-tighter mr-2">{displayRange}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
                </div>
            </button>

            {/* 2. Popover (סימולציה) */}
            {isOpen && (
                <div
                    className={`absolute ${popoverPositionClass} mt-3 w-80 bg-sidebar-bg border border-border-subtle rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden glass-effect border-glow`}
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setIsOpen(false);
                        }
                    }}
                    tabIndex={-1}
                >
                    {/* כותרת Popover */}
                    <div className="p-6 flex justify-between items-center bg-white/[0.03] border-b border-white/[0.05]">
                        <p className={`text-white font-black uppercase tracking-widest flex items-center space-x-3 ${flexDirectionClass} text-xs`}>
                            <Clock className="w-4 h-4 text-accent" />
                            <span>{tSafe('quick_select')}</span>
                        </p>
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* קיצורי דרך */}
                    <div className="p-3 grid grid-cols-2 gap-2">
                        {QUICK_SELECT_OPTIONS.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => handleQuickSelect(opt.key)}
                                className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 ${selectedKey === opt.key ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                {tSafe(opt.labelKey)}
                            </button>
                        ))}
                    </div>

                    {/* אפשרות התאמה אישית */}
                    <div className="p-6 border-t border-white/[0.05] bg-black/20">
                        <h4 className={`text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center space-x-3 ${flexDirectionClass} mb-4`}>
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>{tSafe('custom_selection')}</span>
                        </h4>
                        <div className="flex flex-col space-y-4">
                            <label className="flex flex-col text-[10px] font-black text-gray-500 uppercase tracking-widest gap-2">
                                {tSafe('start_date')}
                                <input
                                    type="date"
                                    value={customStartDate || ''}
                                    onChange={(e) => {
                                        setCustomStartDate(e.target.value);
                                        setSelectedKey('custom');
                                    }}
                                    className="p-3 border border-white/10 rounded-xl bg-black/40 text-white text-sm focus:border-accent focus:ring-0 transition-colors w-full outline-none font-mono"
                                    dir="ltr"
                                />
                            </label>
                            <label className="flex flex-col text-[10px] font-black text-gray-500 uppercase tracking-widest gap-2">
                                {tSafe('end_date')}
                                <input
                                    type="date"
                                    value={customEndDate || ''}
                                    onChange={(e) => {
                                        setCustomEndDate(e.target.value);
                                        setSelectedKey('custom');
                                    }}
                                    className="p-3 border border-white/10 rounded-xl bg-black/40 text-white text-sm focus:border-accent focus:ring-0 transition-colors w-full outline-none font-mono"
                                    dir="ltr"
                                />
                            </label>
                        </div>
                    </div>

                    {/* כפתור ניקוי/איפוס */}
                    <div className="p-4 bg-black/40">
                        <button
                            onClick={handleClear}
                            className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                        >
                            {tSafe('reset_default')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateFilter;