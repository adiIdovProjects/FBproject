"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowUp, ArrowDown, Loader2, Calendar, Filter, DollarSign, MousePointer, Repeat, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

// ייבוא קומפוננטות Recharts מתוך חבילת Recharts
import * as Recharts from 'recharts';
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } = Recharts;

// ----------------------------------------------------------------------
// 1. TYPESCRIPT INTERFACES AND CONSTANTS
// ----------------------------------------------------------------------

// *** ודא שמפתחות אלו תואמים ל-FastAPI (total_spend, date) ***
interface DailyMetric {
    date: string; 
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_purchases: number;
}

interface KpiContainerProps {
    startDate: string | null;
    endDate: string | null;
    apiBaseUrl: string; 
}

interface KpiCardProps {
    title: string;
    value: string;
    icon: React.ComponentType<{ className: string }>;
    trend: 'up' | 'down' | 'flat';
}

interface DateFilterProps {
    onDateRangeChange: (startDate: string | null, endDate: string | null) => void;
}

// ----------------------------------------------------------------------
// 2. UTILITIES AND HOOKS
// ----------------------------------------------------------------------

/**
 * פונקציה לבחירת כתובת ה-API הבסיסית.
 * @returns {string}
 */
const getInitialApiBaseUrl = (): string => {
    return 'http://localhost:8000'; 
};

/**
 * Formats a Date object into 'YYYY-MM-DD' string for the API.
 * *** תיקון קל: שימוש בפונקציות Date כדי לוודא פורמט תקין ומניעת תאריכים חריגים ***
 * @param {Date | null} date
 * @returns {string | null}
 */
const formatDate = (date: Date | null): string | null => {
    if (!date) return null;
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() is 0-indexed
    const day = date.getDate();
    
    // קביעת הקידומת (Padding) ל-0
    const pad = (num: number) => num.toString().padStart(2, '0');

    // מונע תאריכי אפס/שנה לא תקינה כמו 0002
    if (year < 1000) {
        return null;
    }
    
    return `${year}-${pad(month)}-${pad(day)}`;
};

/**
 * ממיר ערך ל-number בצורה בטוחה, מחזיר 0 אם הערך אינו תקין (null, undefined, NaN).
 * @param {any} value - הערך להמרה
 * @returns {number}
 */
const safeParseNumber = (value: any): number => {
    if (value === null || typeof value === 'undefined' || value === '') {
        return 0;
    }
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num; 
};

/**
 * Custom hook for fetching and managing API data.
 */
const useFetchData = (endpoint: string, startDate: string | null, endDate: string | null, apiBaseUrl: string) => {
    const [data, setData] = useState<DailyMetric[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!startDate || !endDate || !apiBaseUrl) {
            setData([]);
            return;
        }

        setLoading(true);
        setError(null);

        // *** ודא שימוש בתאריכים דינמיים מה-state ***
        const url = `${apiBaseUrl}${endpoint}?start_date=${startDate}&end_date=${endDate}`;
        
        console.log(`[DEBUG] Attempting to fetch data from URL: ${url}`);
        
        try {
            const MAX_RETRIES = 3;
            let response: Response | null = null;
            
            for (let i = 0; i < MAX_RETRIES; i++) {
                try {
                    response = await fetch(url);
                    if (response.ok) {
                        console.log(`[DEBUG] API Response successful on attempt ${i + 1}. Status: ${response.status}`);
                        break; 
                    } else if (response.status === 400) {
                        // אם זה 400, זה כנראה שגיאת פורמט תאריך. אין טעם לנסות שוב.
                        throw new Error(`HTTP error! Status: ${response.status}. ודא שפורמט התאריכים (YYYY-MM-DD) תקין.`);
                    } else if (i === MAX_RETRIES - 1) {
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, (2 ** i) * 1000));
                } catch (e: any) {
                    if (i === MAX_RETRIES - 1) throw e;
                }
            }

            if (!response || !response.ok) {
                throw new Error("Failed to fetch data after multiple retries.");
            }
            
            const result: DailyMetric[] = await response.json();
            
            console.log("[DEBUG] Raw API Data Received:", result);

            // *** שימוש במפתחות הנכונים מה-API: date, total_spend, וכו' ***
            const safeData: DailyMetric[] = result.map(item => ({
                date: item.date, 
                total_spend: safeParseNumber(item.total_spend), 
                total_impressions: safeParseNumber(item.total_impressions), 
                total_clicks: safeParseNumber(item.total_clicks), 
                total_purchases: safeParseNumber(item.total_purchases), 
            }));

            const totalSpendSum = safeData.reduce((sum, item) => sum + item.total_spend, 0);
            console.log(`[DEBUG] Total Spend after processing: $${totalSpendSum.toFixed(2)}`);

            setData(safeData);
            setLoading(false);
            
        } catch (err: any) {
            console.error("[ERROR] API Fetch Error:", err);
            setError(`שגיאה באחזור נתונים: ${err.message}. ודא ששרת ה-FastAPI פועל בכתובת ${apiBaseUrl} ושהתאריכים נכונים.`);
            setLoading(false);
            setData([]); 
        }
        
    }, [startDate, endDate, endpoint, apiBaseUrl]); 

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error };
};

// ----------------------------------------------------------------------
// 3. DATE FILTER COMPONENT
// ----------------------------------------------------------------------

/**
 * DateFilter Component. Allows selecting a date range.
 */
const DateFilter: React.FC<DateFilterProps> = ({ onDateRangeChange }) => {
    // הגדרת תאריכי ברירת המחדל לשבוע האחרון
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
                <Filter className="w-6 h-6 text-indigo-400" />
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
                
                {/* קלטי תאריכים */}
                <div className="flex space-x-4 space-x-reverse">
                    <label className="flex flex-col text-sm font-medium text-gray-400">
                        <span className="flex items-center space-x-1 space-x-reverse">
                            <Calendar className="w-4 h-4 text-indigo-400" />
                            <span>תאריך התחלה:</span>
                        </span>
                        <input
                            type="date"
                            value={startDate || ''}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 bg-gray-700 text-gray-100 text-right"
                        />
                    </label>
                    <label className="flex flex-col text-sm font-medium text-gray-400">
                        <span className="flex items-center space-x-1 space-x-reverse">
                            <Calendar className="w-4 h-4 text-indigo-400" />
                            <span>תאריך סיום:</span>
                        </span>
                        <input
                            type="date"
                            value={endDate || ''}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 bg-gray-700 text-gray-100 text-right"
                        />
                    </label>
                </div>

                {/* בחירות מהירות */}
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

// ----------------------------------------------------------------------
// 4. KPI CARD COMPONENT
// ----------------------------------------------------------------------

/**
 * KpiCard Component. Displays a single metric with a comparison indicator.
 */
const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: IconComponent, trend = 'flat' }) => {
    let TrendIconComponent: React.FC<{ className: string }> = TrendingUp; // Default icon
    let trendColor;

    switch (trend) {
        case 'up':
            TrendIconComponent = ArrowUp;
            trendColor = 'text-green-400';
            break;
        case 'down':
            TrendIconComponent = ArrowDown;
            trendColor = 'text-red-400';
            break;
        default:
            TrendIconComponent = TrendingUp;
            trendColor = 'text-gray-500';
    }

    return (
        <div className="bg-gray-800 p-5 rounded-xl shadow-2xl border border-gray-700 flex flex-col justify-between" dir="rtl">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-medium text-gray-400 uppercase">{title}</h3>
                <span className={`p-1 rounded-full ${trendColor} bg-gray-700/50`}>
                    <TrendIconComponent className="w-4 h-4" />
                </span>
            </div>
            <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-gray-50 truncate">
                    {value}
                </div>
                {/* Render the passed icon component */}
                <IconComponent className="w-8 h-8 text-indigo-400 p-1 bg-indigo-400/10 rounded-full" />
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 5. KPI CONTAINER COMPONENT
// ----------------------------------------------------------------------

/**
 * KpiContainer Component. Fetches core metrics data and calculates summary KPIs.
 */
const KpiContainer: React.FC<KpiContainerProps> = ({ startDate, endDate, apiBaseUrl }) => {
    const { data, loading, error } = useFetchData('/api/reports/core_summary/', startDate, endDate, apiBaseUrl);

    // Calculate aggregated metrics from the daily data
    const summary = useMemo(() => {
        if (loading || data.length === 0) {
            return {
                totalSpend: 0,
                totalClicks: 0,
                totalPurchases: 0,
                ctr: 0,
                cpc: 0,
                cpa: 0,
            };
        }

        // Aggregate daily metrics
        const totals = data.reduce((acc, row) => {
            // *** שימוש במפתחות total_XXX מה-API ***
            acc.spend += safeParseNumber(row.total_spend);
            acc.impressions += safeParseNumber(row.total_impressions);
            acc.clicks += safeParseNumber(row.total_clicks);
            acc.purchases += safeParseNumber(row.total_purchases);
            return acc;
        }, { spend: 0, impressions: 0, clicks: 0, purchases: 0 });

        const totalSpend = totals.spend;
        const totalImpressions = totals.impressions;
        const totalClicks = totals.clicks;
        const totalPurchases = totals.purchases;

        // Calculate KPIs, ensuring safe division
        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
        const cpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;

        return {
            totalSpend: totalSpend,
            totalClicks: totalClicks,
            totalPurchases: totalPurchases,
            ctr: ctr,
            cpc: cpc,
            cpa: cpa,
        };
    }, [data, loading]);
    

    if (loading) {
        return <div className="text-center p-8"><Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-400" /> <p className="text-gray-400 mt-2">טוען מדדי KPI...</p></div>;
    }

    if (error) {
        // הצגת שגיאה 
        return <div className="p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-xl mb-4" dir="rtl">שגיאה באחזור נתוני KPI: {error}</div>;
    }
    
    if (data.length === 0 && startDate && endDate) {
        return <div className="p-4 bg-yellow-900/50 border border-yellow-400 text-yellow-300 rounded-xl mb-4" dir="rtl">
            <p className="font-bold">אין נתונים זמינים לטווח התאריכים הנבחר.</p>
            <p className="text-sm mt-1">אנא ודא ששרת ה-FastAPI מופעל ומחזיר נתונים עבור הטווח הנבחר.</p>
        </div>;
    }
    
    // פונקציית עזר לעיצוב ערכים
    const formatValue = (value: number, isCurrency: boolean = false) => {
        if (isNaN(value) || !isFinite(value)) {
            return isCurrency ? '$0.00' : '0';
        }
        return isCurrency 
            ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : value.toLocaleString(undefined, { maximumFractionDigits: isCurrency ? 2 : 0 });
    };


    // --- KPI DATA ---
    const kpiData: KpiCardProps[] = [
        { title: 'הוצאה כוללת', value: formatValue(summary.totalSpend, true), trend: 'up', icon: DollarSign },
        { title: 'קליקים סה"כ', value: formatValue(summary.totalClicks), trend: 'up', icon: MousePointer },
        { title: 'רכישות סה"כ', value: formatValue(summary.totalPurchases), trend: 'up', icon: ArrowRight },
        // CTR מוצג כאחוז
        { title: 'שיעור קליקים (CTR)', value: `${summary.ctr.toFixed(2)}%`, trend: 'up', icon: Repeat },
        { title: 'עלות לקליק (CPC)', value: formatValue(summary.cpc, true), trend: 'down', icon: DollarSign },
        { title: 'עלות לרכישה (CPA)', value: formatValue(summary.cpa, true), trend: 'down', icon: ArrowRight },
    ];

    return (
        <div className="mb-8" dir="rtl">
            {/* אינדיקטור חזותי לסטטוס הנתונים */}
            <p className={`text-sm mb-4 font-mono ${data.length > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                {data.length > 0 
                    ? `מעבד ${data.length} רשומות יומיות עבור הטווח הנבחר. (הוצאה כוללת: ${formatValue(summary.totalSpend, true)})` 
                    : `אין רשומות יומיות לעיבוד (וודא שה-API מחזיר נתונים).`}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {kpiData.map((kpi, index) => (
                    <KpiCard key={index} {...kpi} />
                ))}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 6. DAILY CHART COMPONENT
// ----------------------------------------------------------------------

/**
 * DailyChart Component. Displays daily trend for core metrics using Recharts.
 */
const DailyChart: React.FC<KpiContainerProps> = ({ startDate, endDate, apiBaseUrl }) => {
    const { data, loading, error } = useFetchData('/api/reports/core_summary/', startDate, endDate, apiBaseUrl);

    if (loading) {
        return <div className="text-center py-20 text-indigo-400"><Loader2 className="w-8 h-8 mx-auto animate-spin" /> <p className="mt-2">טוען גרף יומי...</p></div>;
    }

    if (error) {
        return <div className="text-center py-20 text-red-400 font-semibold" dir="rtl">{error}</div>;
    }

    // סידור הנתונים לגרף: מיון לפי תאריך
    const chartData = data.map(item => ({
        // *** שימוש במפתחות total_XXX למיפוי לקריאת Recharts ***
        date: item.date, // שימוש ב-date כציר ה-X
        spend: item.total_spend, // מיפוי ל-spend עבור הגרף
        clicks: item.total_clicks, // מיפוי ל-clicks עבור הגרף
        purchases: item.total_purchases, // מיפוי ל-purchases עבור הגרף
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700" dir="rtl">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">מגמת ביצועים יומית (הוצאה, קליקים, רכישות)</h2>
            
            {chartData.length === 0 ? (
                <div className="text-center py-20 text-gray-400">אין נתונים זמינים לטווח התאריכים הנבחר.</div>
            ) : (
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }} 
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="date" stroke="#9ca3af" angle={-15} textAnchor="end" height={50} />
                            {/* Spend on the left axis */}
                            <YAxis yAxisId="left" stroke="#6366f1" domain={['auto', 'auto']} /> 
                            {/* Clicks/Purchases on the right axis */}
                            <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                            <Tooltip 
                                formatter={(value: number, name: string) => [value.toLocaleString(undefined, { maximumFractionDigits: 2 }), name]}
                                labelStyle={{ fontWeight: 'bold', color: '#e5e7eb' }}
                                contentStyle={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #4b5563', 
                                    borderRadius: '8px', 
                                    padding: '10px', 
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                                    color: '#f3f4f6' 
                                }} 
                            />
                            <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                            
                            {/* Lines for different metrics */}
                            <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#6366f1" name="הוצאה ($)" dot={false} strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#f59e0b" name="קליקים" dot={false} strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="purchases" stroke="#10b981" name="רכישות" dot={false} strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 7. MAIN DASHBOARD COMPONENT (The Page Component)
// ----------------------------------------------------------------------

/**
 * Main component that ties all the parts together and manages the global date state and API URL state.
 */
export default function PerformanceDashboard() {
    // 1. טיפול ב-API Base URL (כדי למנוע שגיאות SSR)
    const [apiBaseUrl, setApiBaseUrl] = useState(getInitialApiBaseUrl);

    useEffect(() => {
        // קוד זה יופעל רק בצד הלקוח (הדפדפן)
        if (typeof window !== 'undefined') {
            const calculatedUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                ? 'http://localhost:8000' 
                : window.location.origin;
            setApiBaseUrl(calculatedUrl);
            console.log(`[INIT] API Base URL set to: ${calculatedUrl}`);
        }
    }, []); 

    // 2. טיפול בטווח תאריכים
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
                <h1 className="text-4xl font-extrabold text-indigo-400 mb-2">לוח מחוונים לביצועי קמפיין</h1>
                <p className="text-gray-400">ניתוח מדדי הליבה והמגמות היומיות לטווח התאריכים הנבחר.</p>
            </header>
            
            {/* 1. בורר תאריכים */}
            <DateFilter onDateRangeChange={handleDateRangeChange} />

            {/* 2. מדדי KPI מצטברים */}
            <KpiContainer startDate={startDate} endDate={endDate} apiBaseUrl={apiBaseUrl} />

            {/* 3. גרף מגמות יומי */}
            <DailyChart startDate={startDate} endDate={endDate} apiBaseUrl={apiBaseUrl} />
            
            <footer className="mt-10 text-center text-sm text-gray-500">
                <p>מערכת דו"חות מבוססת Next.js ו-FastAPI.</p>
                <p className="text-xs mt-1 text-gray-600">כתובת ה-API הנוכחית: {apiBaseUrl}</p>
            </footer>
        </div>
    );
}