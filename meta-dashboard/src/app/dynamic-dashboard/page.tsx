"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, TrendingUp, Calendar, Zap, LayoutGrid } from 'lucide-react';

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
// 2. UTILITIES AND HOOKS (שימוש בפונקציות הקיימות)
// ----------------------------------------------------------------------

// ... [העתק והדבק את הפונקציות formatDate, safeParseNumber, getInitialApiBaseUrl מ-page.tsx] ...

/**
 * Formats a Date object into 'YYYY-MM-DD' string for the API.
 */
const formatDate = (date: Date | null): string | null => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const pad = (num: number) => num.toString().padStart(2, '0');
    if (year < 1000) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
};

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
// 3. THE DYNAMIC CHART COMPONENT
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
// 4. WRAPPER PAGE COMPONENT (דף מלא)
// ----------------------------------------------------------------------

// ... [העתק והדבק את DateFilter מ-page.tsx] ...
// (כדי לא לחזור על קוד, נניח שהעתקת את DateFilter ו-formatDate לתוך קובץ זה)

// DateFilter Component (מפשט גרסה מקובץ page.tsx)
interface DateFilterProps {
    onDateRangeChange: (startDate: string | null, endDate: string | null) => void;
}
const DateFilter: React.FC<DateFilterProps> = ({ onDateRangeChange }) => {
    // ... (העתק והדבק את הקוד של DateFilter)
    const today = new Date();
    const defaultEndDate = formatDate(today);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const defaultStartDate = formatDate(sevenDaysAgo);

    const [startDate, setStartDate] = useState<string | null>(defaultStartDate);
    const [endDate, setEndDate] = useState<string | null>(defaultEndDate);

    useEffect(() => {
        onDateRangeChange(startDate, endDate);
    }, [startDate, endDate, onDateRangeChange]);
    
    const handleQuickSelect = (days: number) => {
        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - days);
        setEndDate(formatDate(end));
        setStartDate(formatDate(start));
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl mb-8 border border-gray-700" dir="rtl">
            <h2 className="text-xl font-semibold text-gray-200 mb-4 flex items-center space-x-2 justify-end space-x-reverse">
                <span>בורר טווח תאריכים</span>
                <Calendar className="w-6 h-6 text-indigo-400" />
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
                <div className="flex space-x-4 space-x-reverse">
                    <label className="flex flex-col text-sm font-medium text-gray-400">
                        <span>תאריך התחלה:</span>
                        <input
                            type="date"
                            value={startDate || ''}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 text-right"
                        />
                    </label>
                    <label className="flex flex-col text-sm font-medium text-gray-400">
                        <span>תאריך סיום:</span>
                        <input
                            type="date"
                            value={endDate || ''}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 text-right"
                        />
                    </label>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => handleQuickSelect(7)} 
                        className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition duration-150 shadow-md"
                    >
                        7 ימים אחרונים
                    </button>
                    <button 
                        onClick={() => handleQuickSelect(30)} 
                        className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition duration-150 shadow-md"
                    >
                        30 ימים אחרונים
                    </button>
                </div>
            </div>
        </div>
    );
};


/**
 * DynamicChartPage Component. The main page wrapper.
 */
export default function DynamicChartPage() {
    const [apiBaseUrl] = useState(getInitialApiBaseUrl);

    const today = new Date();
    const defaultEndDate = formatDate(today);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const defaultStartDate = formatDate(sevenDaysAgo);

    const [startDate, setStartDate] = useState<string | null>(defaultStartDate);
    const [endDate, setEndDate] = useState<string | null>(defaultEndDate);

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
            
            {/* 1. בורר תאריכים */}
            <DateFilter onDateRangeChange={handleDateRangeChange} />

            {/* 2. הגרף הדינמי */}
            <DynamicChart startDate={startDate} endDate={endDate} apiBaseUrl={apiBaseUrl} />
            
            <footer className="mt-10 text-center text-sm text-gray-500">
                <p>מערכת דו"חות מבוססת Next.js ו-FastAPI.</p>
                <p className="text-xs mt-1 text-gray-600">כתובת ה-API הנוכחית: {apiBaseUrl}</p>
            </footer>
        </div>
    );
}