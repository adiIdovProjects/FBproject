// DynamicChartPage.tsx (הקובץ המתוקן והמאוחד)

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, TrendingUp, Calendar, Zap, LayoutGrid, ChevronDown, Clock, X, SlidersHorizontal } from 'lucide-react';

// ייבוא קומפוננטות Recharts מתוך חבילת Recharts
import * as Recharts from 'recharts';
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } = Recharts;

// ----------------------------------------------------------------------
// 1. TYPESCRIPT INTERFACES AND CONSTANTS
// ----------------------------------------------------------------------

// *** עדכון המטריקות לכלול את ה-KPIs החדשים מ-analytics.py ***
interface MetricData {
    date: string; 
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_purchases: number;
    total_ctr: number;
    total_cpc: number;
    total_cpa: number;
}

// הגדרת המטריקות הזמינות לבחירה בגרף
const METRIC_OPTIONS = [
    { key: 'total_spend', label: 'הוצאה ($)', color: '#6366f1', format: (v: number) => `$${v.toFixed(2)}` },
    { key: 'total_clicks', label: 'קליקים', color: '#f59e0b', format: (v: number) => v.toLocaleString() },
    { key: 'total_impressions', label: 'חשיפות', color: '#10b981', format: (v: number) => v.toLocaleString() },
    { key: 'total_ctr', label: 'שיעור קליקים (CTR)', color: '#f97316', format: (v: number) => `${(v * 100).toFixed(2)}%` },
    { key: 'total_cpc', label: 'עלות לקליק (CPC)', color: '#ef4444', format: (v: number) => `$${v.toFixed(2)}` },
    { key: 'total_cpa', label: 'עלות לרכישה (CPA)', color: '#3b82f6', format: (v: number) => `$${v.toFixed(2)}` },
];

// הגדרת הגרנולריות
const GRANULARITY_OPTIONS = [
    { key: 'day', label: 'יומי' },
    { key: 'week', label: 'שבועי' },
    { key: 'month', label: 'חודשי' },
];

// ----------------------------------------------------------------------
// 2. UTILITIES AND HOOKS
// ----------------------------------------------------------------------

/**
 * Formats a Date object into 'YYYY-MM-DD' string for the API.
 */
const formatDate = (date: Date | null): string | null => {
    if (!date || isNaN(date.getTime())) return null; 
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const pad = (num: number) => num.toString().padStart(2, '0');
    if (year < 1000) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
};

/**
 * Utility function to calculate date ranges based on a key (הועתק מ-DateFilter.tsx המקורי).
 */
const calculateDateRange = (key: string): { start: Date | null, end: Date | null } => { 
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
            start.setDate(1); // First day of the current month
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

// --- הגדרות טווחי תאריכים קבועים (הועתק מ-DateFilter.tsx המקורי) ---
const QUICK_SELECT_OPTIONS = [ 
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


const safeParseNumber = (value: any): number => {
    if (value === null || typeof value === 'undefined' || value === '') return 0;
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
};

const getInitialApiBaseUrl = (): string => {
    return typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? 'http://localhost:8000' 
        : 'http://localhost:8000'; // ברירת מחדל ל-8000
};


/**
 * Custom hook for fetching and managing API data (מותאם לגרנולריות).
 */
const useDynamicFetchData = (
    endpoint: string, 
    startDate: string | null, 
    endDate: string | null, 
    apiBaseUrl: string, 
    granularity: string
) => {
    const [data, setData] = useState<MetricData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!startDate || !endDate || !apiBaseUrl) {
            setData([]);
            return;
        }

        setLoading(true);
        setError(null);

        // *** שינוי: הוספת פרמטר granularity ל-URL ***
        const url = `${apiBaseUrl}${endpoint}?start_date=${startDate}&end_date=${endDate}&granularity=${granularity}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorDetail = await response.json().catch(() => ({ detail: 'No further details' }));
                throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorDetail.detail}`);
            }
            
            const result: MetricData[] = await response.json();

            // המרה בטוחה של הנתונים
            const safeData: MetricData[] = result.map(item => ({
                date: item.date, 
                total_spend: safeParseNumber(item.total_spend), 
                total_impressions: safeParseNumber(item.total_impressions), 
                total_clicks: safeParseNumber(item.total_clicks), 
                total_purchases: safeParseNumber(item.total_purchases),
                // *** שינוי: שימוש במפתחות החדשים total_ctr, total_cpc, total_cpa ***
                total_ctr: safeParseNumber(item.total_ctr),
                total_cpc: safeParseNumber(item.total_cpc),
                total_cpa: safeParseNumber(item.total_cpa),
            }));

            // מיון הנתונים לפי תאריך
            safeData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            setData(safeData);
            setLoading(false);
            
        } catch (err: any) {
            console.error("[ERROR] API Fetch Error:", err);
            setError(`שגיאה באחזור נתונים: ${err.message}. ודא ששרת ה-FastAPI מופעל ומעודכן.`);
            setLoading(false);
            setData([]); 
        }
        
    }, [startDate, endDate, endpoint, apiBaseUrl, granularity]); 

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error };
};


// ----------------------------------------------------------------------
// 3. DATE FILTER COMPONENT (מעודכן לגודל הגדול)
// ----------------------------------------------------------------------

interface DateFilterProps {
    onDateRangeChange: (startDate: string | null, endDate: string | null) => void;
}

/**
 * רכיב DateFilter מתקדם (מדומה Popover) - **מעודכן לגודל 255.11X37.6**
 */
const DateFilter: React.FC<DateFilterProps> = ({ onDateRangeChange }) => {
    
    const defaultRangeKey = 'last_7_days';
    const initialDates = useMemo(() => calculateDateRange(defaultRangeKey), []);

    const [selectedKey, setSelectedKey] = useState<string>(defaultRangeKey);
    const [isOpen, setIsOpen] = useState(false); 
    
    // States עבור מצב 'Custom' בלבד
    const [customStartDate, setCustomStartDate] = useState<string | null>(formatDate(initialDates.start));
    const [customEndDate, setCustomEndDate] = useState<string | null>(formatDate(initialDates.end));

    // --- חישוב טווחי התאריכים הסופיים ---
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

    // 1. אפקט לדיווח שינויי תאריכים ל-Parent
    useEffect(() => {
        // מפעיל את onDateRangeChange רק אם יש תאריכים חוקיים כדי למנוע קריאות API מיותרות
        if (finalStartDate && finalEndDate) {
            onDateRangeChange(finalStartDate, finalEndDate);
        }
    }, [finalStartDate, finalEndDate, onDateRangeChange]);

    // --- פונקציות לוגיקה --- 
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
        // איפוס לברירת מחדל (7 ימים אחרונים)
        handleQuickSelect(defaultRangeKey);
    };

    const formatDisplayDate = (dateString: string | null): string => {
        if (!dateString) return 'בחר תאריך';
        try {
            const [year, month, day] = dateString.split('-');
            // רק יום וחודש
            return `${day}-${month}`; 
        } catch (e) {
            return dateString;
        }
    };

    // עיצוב התאריכים בתוך הכפתור 
    const displayRange = `${formatDisplayDate(finalStartDate)} - ${formatDisplayDate(finalEndDate)}`;

    return (
        // *** שינוי: שימוש ב-w-64 (256px) ו-py-2 ***
        <div className="relative w-full md:w-auto z-10" dir="rtl">
            {/* 1. כפתור Date Picker הראשי */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                // **UPDATED**: w-64, px-4 py-2
                className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-100 rounded-lg border border-gray-700 hover:bg-gray-700 transition duration-150 shadow-lg w-64"
            >
                {/* **UPDATED**: w-5 h-5, text-sm */}
                <div className="flex items-center space-x-2 space-x-reverse whitespace-nowrap">
                    <Calendar className="w-5 h-5 text-indigo-400" /> 
                    <span className="text-sm font-semibold">{label}</span> 
                </div>
                {/* **UPDATED**: text-sm, w-4 h-4 */}
                <div className="flex items-center text-sm font-medium text-gray-300 whitespace-nowrap">
                    {displayRange}
                    <ChevronDown className={`w-4 h-4 mr-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} /> 
                </div>
            </button>

            {/* 2. Popover (סימולציה) */}
            {isOpen && (
                <div 
                    // **UPDATED**: w-80
                    className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden" 
                    onBlur={() => setIsOpen(false)} 
                    tabIndex={-1}
                >
                    {/* כותרת Popover - **UPDATED**: p-4, text-base */}
                    <div className="p-4 flex justify-between items-center bg-gray-700/50">
                        <p className="text-gray-200 font-semibold flex items-center space-x-2 space-x-reverse text-base">
                            <Clock className="w-5 h-5 text-indigo-400" />
                            <span>בחירה מהירה</span>
                        </p>
                        {/* כפתור סגירה - **UPDATED**: w-5 h-5 */}
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition">
                            <X className="w-5 h-5" /> 
                        </button>
                    </div>

                    {/* קיצורי דרך - **UPDATED**: p-2, py-2, text-sm */}
                    <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                        {QUICK_SELECT_OPTIONS.map((opt) => (
                            <button 
                                key={opt.key}
                                onClick={() => handleQuickSelect(opt.key)}
                                className={`w-full text-right px-3 py-2 text-sm rounded-md transition duration-100 ${selectedKey === opt.key ? 'bg-indigo-600 text-white font-bold' : 'text-gray-200 hover:bg-gray-700'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* אפשרות התאמה אישית - **UPDATED**: p-4, text-sm, w-5 h-5 */}
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
                                    // **UPDATED**: p-2, text-sm
                                    className="mt-1 p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 text-sm w-full"
                                    dir="ltr" // תאריך מוצג ב-LTR
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
                                    // **UPDATED**: p-2, text-sm
                                    className="mt-1 p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 text-sm w-full"
                                    dir="ltr" // תאריך מוצג ב-LTR
                                />
                            </label>
                        </div>
                    </div>
                    
                    {/* כפתור ניקוי/איפוס - **UPDATED**: p-4, py-2, text-sm */}
                    <div className="p-4 border-t border-gray-700">
                        <button
                            onClick={handleClear}
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


// ----------------------------------------------------------------------
// 4. THE DYNAMIC CHART COMPONENT (ללא שינוי מהקוד הקודם שלך)
// ----------------------------------------------------------------------

interface DynamicChartProps {
    startDate: string | null;
    endDate: string | null;
    apiBaseUrl: string;
}

const DynamicChart: React.FC<DynamicChartProps> = ({ startDate, endDate, apiBaseUrl }) => {
    
    // State לניהול המטריקה והגרנולריות הנבחרות
    const [selectedMetric, setSelectedMetric] = useState(METRIC_OPTIONS[0]);
    const [selectedGranularity, setSelectedGranularity] = useState(GRANULARITY_OPTIONS[0].key);

    // אחזור הנתונים
    const { data, loading, error } = useDynamicFetchData(
        '/api/reports/core_summary/', 
        startDate, 
        endDate, 
        apiBaseUrl, 
        selectedGranularity
    );

    // עיצוב ה-Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const metric = METRIC_OPTIONS.find(opt => opt.key === payload[0].dataKey);
            
            return (
                <div dir="rtl" className="p-2 bg-gray-700/95 border border-gray-600 rounded shadow-lg text-sm text-gray-100">
                    <p className="font-bold text-indigo-400 mb-1">{label}</p>
                    <p className="text-white">
                        {metric?.label}: <span className="font-mono">{metric?.format(payload[0].value)}</span>
                    </p>
                </div>
            );
        }
        return null;
    };
    
    // קביעת הפורמט לציר ה-Y
    const formatYAxis = useCallback((value: number) => {
        return selectedMetric.format(value).replace(/[$,%]/g, ''); // הסרת סימני מטבע/אחוזים מהציר
    }, [selectedMetric]);


    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 mt-8" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-200 flex items-center space-x-2 space-x-reverse">
                    <span>גרף מגמה דינמי</span>
                    <TrendingUp className="w-6 h-6 text-indigo-400" />
                </h2>
                
                {/* בורר מטריקה וגרנולריות */}
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse mt-4 md:mt-0">
                    {/* בורר מטריקה */}
                    <select
                        value={selectedMetric.key}
                        onChange={(e) => {
                            const newMetric = METRIC_OPTIONS.find(opt => opt.key === e.target.value);
                            if (newMetric) setSelectedMetric(newMetric);
                        }}
                        className="p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {METRIC_OPTIONS.map(opt => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                    </select>

                    {/* בורר גרנולריות */}
                    <select
                        value={selectedGranularity}
                        onChange={(e) => setSelectedGranularity(e.target.value)}
                        className="p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {GRANULARITY_OPTIONS.map(opt => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && <div className="text-center py-20 text-indigo-400"><Loader2 className="w-8 h-8 mx-auto animate-spin" /> <p className="mt-2">טוען נתונים לפי {selectedGranularity}...</p></div>}
            
            {error && <div className="p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-xl mb-4" dir="rtl">{error}</div>}

            {!loading && !error && data.length === 0 && (
                <div className="text-center py-20 text-gray-400">אין נתונים זמינים לטווח התאריכים והגרנולריות הנבחרים.</div>
            )}

            {!loading && !error && data.length > 0 && (
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 10, right: 30, left: 20, bottom: 5 }} 
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            {/* ציר X: תאריך */}
                            <XAxis dataKey="date" stroke="#9ca3af" angle={-15} textAnchor="end" height={50} />
                            
                            {/* ציר Y: הערך הנבחר */}
                            <YAxis 
                                yAxisId="main" 
                                stroke={selectedMetric.color} 
                                label={{ value: selectedMetric.label, angle: -90, position: 'insideLeft', fill: selectedMetric.color }}
                                tickFormatter={formatYAxis} // עיצוב ציר Y
                            /> 

                            <Tooltip content={<CustomTooltip />} />
                            
                            <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                            
                            {/* קו אחד שמציג את המטריקה הנבחרת */}
                            <Line 
                                yAxisId="main" 
                                type="monotone" 
                                dataKey={selectedMetric.key} 
                                stroke={selectedMetric.color} 
                                name={selectedMetric.label} 
                                dot={false} 
                                strokeWidth={3} 
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};


// ----------------------------------------------------------------------
// 5. DynamicChartPage Component. The main page wrapper.
// ----------------------------------------------------------------------

export default function DynamicChartPage() {
    const [apiBaseUrl] = useState(getInitialApiBaseUrl);

    // הלוגיקה של DateFilter דורשת טווח התחלתי (7 ימים אחרונים)
    const defaultRangeKey = 'last_7_days';
    const initialDates = useMemo(() => calculateDateRange(defaultRangeKey), []);

    const [startDate, setStartDate] = useState<string | null>(formatDate(initialDates.start));
    const [endDate, setEndDate] = useState<string | null>(formatDate(initialDates.end));

    const handleDateRangeChange = useCallback((start: string | null, end: string | null) => {
        setStartDate(start);
        setEndDate(end);
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
            <header className="mb-8" dir="rtl">
                <h1 className="text-4xl font-extrabold text-indigo-400 mb-2">📊 דשבורד אנליטי דינמי</h1>
                <p className="text-gray-400">הצגת מגמת זמן עבור מטריקה נבחרת לפי גרנולריות (יומי/שבועי/חודשי).</p>
            </header>
            
            {/* בורר תאריכים */}
            <div className="flex justify-end mb-8">
                <DateFilter onDateRangeChange={handleDateRangeChange} />
            </div>

            {/* הגרף הדינמי */}
            <DynamicChart startDate={startDate} endDate={endDate} apiBaseUrl={apiBaseUrl} />
            
            <footer className="mt-10 text-center text-sm text-gray-500">
                <p>מערכת דו"חות מבוססת Next.js ו-FastAPI.</p>
                <p className="text-xs mt-1 text-gray-600">כתובת ה-API הנוכחית: {apiBaseUrl}</p>
            </footer>
        </div>
    );
}