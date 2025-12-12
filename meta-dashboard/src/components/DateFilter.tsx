// components/DateFilter.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ChevronDown, Clock, X, SlidersHorizontal } from 'lucide-react';

// ----------------------------------------------------------------------
// 1. TYPESCRIPT INTERFACES
// ----------------------------------------------------------------------

interface DateFilterProps {
    onDateRangeChange: (startDate: string | null, endDate: string | null) => void;
}

// ----------------------------------------------------------------------
// 2. UTILITIES AND CONSTANTS (EXPORTS)
// ----------------------------------------------------------------------

// ... [formatDate ו-calculateDateRange ו-QUICK_SELECT_OPTIONS נשארים זהים] ...

/**
 * Formats a Date object into 'YYYY-MM-DD' string for the API.
 */
export const formatDate = (date: Date | null): string | null => {
    if (!date || isNaN(date.getTime())) return null; 
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const pad = (num: number) => num.toString().padStart(2, '0');
    if (year < 1000) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
};

/**
 * Utility function to calculate date ranges based on a key.
 */
export const calculateDateRange = (key: string): { start: Date | null, end: Date | null } => { 
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const start = new Date(today);
    const end = new Date(today);
    
    const dayOfWeek = today.getDay(); 

    switch (key) {
        case 'yesterday':
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
            return { start, end };
        case 'today_and_yesterday':
            start.setDate(today.getDate() - 1);
            return { start, end };
        case 'last_7_days':
            start.setDate(today.getDate() - 6); 
            return { start, end };
        case 'last_14_days':
            start.setDate(today.getDate() - 13);
            return { start, end };
        case 'last_28_days':
            start.setDate(today.getDate() - 27);
            return { start, end };
        case 'last_30_days':
            start.setDate(today.getDate() - 29);
            return { start, end };
        case 'this_week':
             const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
             start.setDate(today.getDate() - daysToSubtract);
             return { start, end };
        case 'last_week':
             const startOfThisWeek = calculateDateRange('this_week').start!;
             start.setTime(startOfThisWeek.getTime());
             start.setDate(start.getDate() - 7);
             end.setTime(startOfThisWeek.getTime());
             end.setDate(end.getDate() - 1); 
             return { start, end };
        case 'this_month':
            start.setDate(1); 
            return { start, end };
        case 'last_month':
            const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            end.setTime(startOfThisMonth.getTime());
            end.setDate(end.getDate() - 1);
            start.setFullYear(today.getFullYear(), today.getMonth() - 1, 1);
            return { start, end };
        case 'maximum':
            return { start: new Date(2020, 0, 1), end: today };
        case 'custom':
        default:
            return { start: null, end: null };
    }
}

export const QUICK_SELECT_OPTIONS = [ 
    { key: 'yesterday', label: 'אתמול' },
    { key: 'today_and_yesterday', label: 'היום ואתמול' },
    { key: 'last_7_days', label: '7 ימים אחרונים' },
    { key: 'last_14_days', label: '14 ימים אחרונים' },
    { key: 'last_28_days', label: '28 ימים אחרונים' },
    { key: 'last_30_days', label: '30 ימים אחרונים' },
    { key: 'this_week', label: 'השבוע הנוכחי' },
    { key: 'last_week', label: 'שבוע שעבר' },
    { key: 'this_month', label: 'החודש הנוכחי' },
    { key: 'last_month', label: 'חודש שעבר' },
    { key: 'maximum', label: 'מקסימלי (כל הנתונים)' },
    { key: 'custom', label: 'התאמה אישית' },
];

// ----------------------------------------------------------------------
// 3. DATE FILTER COMPONENT (EXPORT DEFAULT)
// ----------------------------------------------------------------------

const DateFilter: React.FC<DateFilterProps> = ({ onDateRangeChange }) => {
    
    const defaultRangeKey = 'last_7_days';
    const initialDates = useMemo(() => calculateDateRange(defaultRangeKey), []);

    const [selectedKey, setSelectedKey] = useState<string>(defaultRangeKey);
    const [isOpen, setIsOpen] = useState(false); 
    
    const [customStartDate, setCustomStartDate] = useState<string | null>(formatDate(initialDates.start));
    const [customEndDate, setCustomEndDate] = useState<string | null>(formatDate(initialDates.end));

    const { finalStartDate, finalEndDate, label } = useMemo(() => {
        let start: Date | null = null;
        let end: Date | null = null;
        let currentLabel = QUICK_SELECT_OPTIONS.find(opt => opt.key === selectedKey)?.label || '';

        if (selectedKey === 'custom') {
            currentLabel = 'התאמה אישית';
            return { finalStartDate: customStartDate, finalEndDate: customEndDate, label: currentLabel };
        } else {
            const calculated = calculateDateRange(selectedKey);
            start = calculated.start;
            end = calculated.end;
        }

        return { 
            finalStartDate: formatDate(start), 
            finalEndDate: formatDate(end), 
            label: currentLabel 
        };
    }, [selectedKey, customStartDate, customEndDate]);

    useEffect(() => {
        if (finalStartDate && finalEndDate) {
            onDateRangeChange(finalStartDate, finalEndDate);
        }
    }, [finalStartDate, finalEndDate, onDateRangeChange]);

    const handleQuickSelect = (key: string) => {
        setSelectedKey(key);
        setIsOpen(false);
        if (key !== 'custom') {
            const calculated = calculateDateRange(key);
            setCustomStartDate(formatDate(calculated.start));
            setCustomEndDate(formatDate(calculated.end));
        }
    };

    const handleClear = () => {
        handleQuickSelect(defaultRangeKey);
    };

    const formatDisplayDate = (dateString: string | null): string => {
        if (!dateString) return 'בחר תאריך';
        try {
            const [year, month, day] = dateString.split('-');
            return `${day}-${month}`; 
        } catch (e) {
            return dateString;
        }
    };

    const displayRange = `${formatDisplayDate(finalStartDate)} - ${formatDisplayDate(finalEndDate)}`;

    return (
        // *** שינוי: הגדלת רוחב הכפתור מ-w-48 ל-w-64 (256px) ***
        <div className="relative w-full md:w-auto z-10" dir="rtl">
            {/* 1. כפתור Date Picker הראשי */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                // שינוי: הגדלת padding אנכי ל-py-2, והגדלת רוחב ל-w-64
                className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-100 rounded-lg border border-gray-700 hover:bg-gray-700 transition duration-150 shadow-lg w-64"
            >
                {/* שינוי: הגדלת אייקונים וטקסט */}
                <div className="flex items-center space-x-2 space-x-reverse whitespace-nowrap">
                    <Calendar className="w-5 h-5 text-indigo-400" /> 
                    <span className="text-sm font-semibold">{label}</span> 
                </div>
                {/* שינוי: הגדלת טקסט ל-text-sm */}
                <div className="flex items-center text-sm font-medium text-gray-300 whitespace-nowrap">
                    {displayRange}
                    <ChevronDown className={`w-4 h-4 mr-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} /> 
                </div>
            </button>

            {/* 2. Popover (סימולציה) */}
            {isOpen && (
                <div 
                    // שינוי: הגדלת רוחב Popover מ-w-56 ל-w-80 (320px)
                    className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden" 
                    onBlur={() => setIsOpen(false)} 
                    tabIndex={-1}
                >
                    {/* כותרת Popover */}
                    <div className="p-4 flex justify-between items-center bg-gray-700/50">
                        <p className="text-gray-200 font-semibold flex items-center space-x-2 space-x-reverse text-base">
                            <Clock className="w-5 h-5 text-indigo-400" />
                            <span>בחירה מהירה</span>
                        </p>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition">
                            <X className="w-5 h-5" /> 
                        </button>
                    </div>

                    {/* קיצורי דרך */}
                    <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                        {QUICK_SELECT_OPTIONS.map((opt) => (
                            <button 
                                key={opt.key}
                                onClick={() => handleQuickSelect(opt.key)}
                                // שינוי: הגדלת padding אנכי ל-py-2, והגדלת טקסט ל-text-sm
                                className={`w-full text-right px-3 py-2 text-sm rounded-md transition duration-100 ${selectedKey === opt.key ? 'bg-indigo-600 text-white font-bold' : 'text-gray-200 hover:bg-gray-700'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* אפשרות התאמה אישית */}
                    <div className="p-4 border-t border-gray-700">
                        <h4 className="text-gray-400 text-sm font-semibold flex items-center space-x-2 space-x-reverse mb-3">
                            <SlidersHorizontal className="w-5 h-5 text-gray-400" />
                            <span>התאמה אישית</span>
                        </h4>
                        <div className="flex flex-col space-y-3">
                            <label className="flex flex-col text-sm font-medium text-gray-400">
                                תאריך התחלה
                                <input
                                    type="date"
                                    value={customStartDate || ''}
                                    onChange={(e) => {
                                        setCustomStartDate(e.target.value);
                                        setSelectedKey('custom');
                                    }}
                                    // שינוי: הגדלת padding וטקסט
                                    className="mt-1 p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 text-sm w-full"
                                    dir="ltr"
                                />
                            </label>
                            <label className="flex flex-col text-sm font-medium text-gray-400">
                                תאריך סיום
                                <input
                                    type="date"
                                    value={customEndDate || ''}
                                    onChange={(e) => {
                                        setCustomEndDate(e.target.value);
                                        setSelectedKey('custom');
                                    }}
                                    // שינוי: הגדלת padding וטקסט
                                    className="mt-1 p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 text-sm w-full"
                                    dir="ltr"
                                />
                            </label>
                        </div>
                    </div>
                    
                    {/* כפתור ניקוי/איפוס */}
                    <div className="p-4 border-t border-gray-700">
                        <button
                            onClick={handleClear}
                            // שינוי: הגדלת padding וטקסט
                            className="w-full text-center py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-150"
                        >
                            איפוס לברירת מחדל
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateFilter;