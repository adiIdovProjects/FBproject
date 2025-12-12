// page.tsx (הקובץ המתוקן)

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
// ייבוא רכיב הפילטר והפונקציות הנחוצות (נתיב משוער: ../components/DateFilter)
import DateFilter, { formatDate, calculateDateRange } from '../components/DateFilter';
// ייבוא האייקונים הדרושים
import { ArrowUp, ArrowDown, Loader2, Calendar, Filter, DollarSign, MousePointer, Repeat, ArrowRight, TrendingUp, TrendingDown, ChevronDown, Clock, X, SlidersHorizontal, Settings } from 'lucide-react';

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
    trend: 'up' | 'down' | 'flat'; // Literal Type
}

// ----------------------------------------------------------------------
// 2. UTILITIES AND HOOKS
// ----------------------------------------------------------------------

/**
 * פונקציה לבחירת כתובת ה-API הבסיסית.
 * @returns {string}
 */
const getInitialApiBaseUrl = (): string => {
    // בברירת מחדל משתמש ב-localhost (כדי למנוע שגיאות SSR)
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8000';
    }
    return 'http://localhost:8000'; 
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
    // השתמש ב-useFetchData עם הפרמטרים המועברים
    const { data, loading, error } = useFetchData('/api/reports/core_summary/', startDate, endDate, apiBaseUrl);

    // Calculate aggregated metrics from the daily data
    const summary = useMemo(() => {
        if (loading || data.length === 0) {
            return {
                totalSpend: 0,
                totalImpressions: 0, 
                totalClicks: 0,
                totalPurchases: 0,
                ctr: 0, // Click-Through Rate
                cpc: 0, // Cost Per Click
                cpa: 0, // Cost Per Acquisition (Purchase)
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
            totalImpressions: totalImpressions, 
            totalClicks: totalClicks,
            totalPurchases: totalPurchases,
            ctr: ctr,
            cpc: cpc,
            cpa: cpa,
        };
    }, [data, loading]);

    // Format numbers for display
    const formatValue = useCallback((value: number, isCurrency: boolean = false): string => {
        if (isNaN(value) || !isFinite(value)) {
            return isCurrency ? '$0.00' : '0';
        }
        // שימוש בפורמט מטבע דולרי ($)
        return isCurrency 
            ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : value.toLocaleString(undefined, { maximumFractionDigits: isCurrency ? 2 : 0 });
    }, []);

    if (loading) {
        return <div className="text-center p-8"><Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-400" /> <p className="text-gray-400 mt-2">טוען מדדי KPI...</p></div>;
    }

    if (error) {
        return <div className="p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-xl mb-4" dir="rtl">שגיאה באחזור נתוני KPI: {error}</div>;
    }
    
    if (data.length === 0 && startDate && endDate) {
        return <div className="p-4 bg-yellow-900/50 border border-yellow-400 text-yellow-300 rounded-xl mb-4" dir="rtl">
            <p className="font-bold">אין נתונים זמינים לטווח התאריכים הנבחר.</p>
            <p className="text-sm mt-1">אנא ודא ששרת ה-FastAPI מופעל ומחזיר נתונים עבור הטווח הנבחר.</p>
        </div>;
    }

    // --- KPI DATA ---
    const kpiData: KpiCardProps[] = [
        { title: 'הוצאה כוללת', value: formatValue(summary.totalSpend, true), trend: 'up', icon: DollarSign },
        { title: 'הופעות סה"כ', value: formatValue(summary.totalImpressions), trend: 'up', icon: Calendar }, 
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
                {data.length > 0 ? `מעבד ${data.length} רשומות יומיות עבור הטווח הנבחר. (הוצאה כוללת: ${formatValue(summary.totalSpend, true)})` : `אין רשומות יומיות לעיבוד (וודא שה-API מחזיר נתונים).`}
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
    // השתמש ב-useFetchData עם הפרמטרים המועברים
    const { data, loading, error } = useFetchData('/api/reports/core_summary/', startDate, endDate, apiBaseUrl);

    if (loading) {
        return <div className="text-center py-20 text-indigo-400"><Loader2 className="w-8 h-8 mx-auto animate-spin" /> <p className="mt-2">טוען גרף יומי...</p></div>;
    }

    if (error) {
        return <div className="p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-xl mb-4" dir="rtl">שגיאה בטעינת הגרף: {error}</div>;
    }

    if (data.length === 0) {
        return <div className="text-center py-20 text-gray-400"><Settings className="w-8 h-8 mx-auto" /> <p className="mt-2">אין נתונים יומיים להצגה בגרף עבור הטווח הנבחר.</p></div>;
    }

    // נתונים לגרף: date, total_spend, total_clicks, total_purchases
    const chartData = data.map(item => ({
        date: item.date,
        spend: item.total_spend,
        clicks: item.total_clicks,
        purchases: item.total_purchases,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Custom Tooltip content
    const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            // פורמט תאריך נקי יותר
            const formattedDate = new Date(label).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return (
                <div className="bg-gray-900/90 border border-gray-700 p-3 rounded-lg shadow-xl text-right text-sm" dir="rtl">
                    <p className="text-white font-bold mb-1">{formattedDate}</p>
                    {payload.map((item: any, index: number) => {
                        // שימוש במעצב ספציפי עבור ה-Tooltip
                        const formattedValue = item.name.includes('($)') 
                            ? new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.value)
                            : new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(item.value);

                        return (
                            <p key={index} style={{ color: item.stroke }} className="font-medium">
                                {item.name}: {formattedValue}
                            </p>
                        );
                    })}
                </div>
            );
        }

        return null;
    };


    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700" dir="rtl">
            <h3 className="text-xl font-bold text-gray-100 mb-4">מגמת ביצועים יומית (הוצאה, קליקים, רכישות)</h3>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                    {/* X-Axis: תאריכים */}
                    <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af" 
                        tickLine={false} 
                        axisLine={{ stroke: '#4b5563' }}
                        tickFormatter={(tick) => new Date(tick).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                        style={{ fontSize: '12px' }}
                        interval="preserveStart"
                    />
                    {/* Y-Axis: הוצאה (משמאל) */}
                    <YAxis 
                        yAxisId="left" 
                        stroke="#9ca3af" 
                        tickLine={false} 
                        axisLine={{ stroke: '#4b5563' }}
                        tickFormatter={(value) => new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(value)}
                        style={{ fontSize: '12px' }}
                    />
                    {/* Y-Axis: קליקים/רכישות (מימין) */}
                    <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#f59e0b" // צבע לנתונים בציר ימין
                        tickLine={false} 
                        axisLine={{ stroke: '#4b5563' }}
                        tickFormatter={(value) => new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(value)}
                        style={{ fontSize: '12px' }}
                    />
                    
                    <Tooltip content={<CustomTooltip />} />
                    
                    <Legend wrapperStyle={{ color: '#e5e7eb', direction: 'rtl', paddingRight: '25px' }} />
                    
                    {/* Lines for different metrics */}
                    <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#6366f1" name="הוצאה ($)" dot={false} strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#f59e0b" name="קליקים" dot={false} strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="purchases" stroke="#10b981" name="רכישות" dot={false} strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

// ----------------------------------------------------------------------
// 7. MAIN DASHBOARD COMPONENT (PerformanceDashboard)
// ----------------------------------------------------------------------

/**
 * Main dashboard component. Manages core state (API URL and date range).
 */
export default function PerformanceDashboard() {
    // 1. טיפול ב-API Base URL
    const [apiBaseUrl, setApiBaseUrl] = useState(getInitialApiBaseUrl);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const calculatedUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8000' : window.location.origin;
            // setApiBaseUrl(calculatedUrl); // נשאר עם http://localhost:8000 לצורך בדיקה מקומית
        }
    }, []);

    // 2. טיפול ב-Date State
    // ברירת מחדל ל'7 ימים אחרונים'
    const defaultRangeKey = 'last_7_days';
    // משתמש בפונקציה המיובאת
    const initialDates = calculateDateRange(defaultRangeKey); 

    const [startDate, setStartDate] = useState<string | null>(formatDate(initialDates.start));
    const [endDate, setEndDate] = useState<string | null>(formatDate(initialDates.end));

    // פונקציה שתעבור ל-DateFilter
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
            
            {/* 1. בורר תאריכים - ה-div שמשתמש ב-flex justify-end ידחוף את הפילטר לצד ימין (בהקשר RTL) */}
            <div className="mb-8 flex justify-end">
                <DateFilter onDateRangeChange={handleDateRangeChange} />
            </div>

            {/* 2. מדדי KPI מצטברים */}
            <KpiContainer startDate={startDate} endDate={endDate} apiBaseUrl={apiBaseUrl} />

            {/* 3. גרף מגמות יומי */}
            <DailyChart startDate={startDate} endDate={endDate} apiBaseUrl={apiBaseUrl} />
            
            <footer className="mt-10 text-center text-sm text-gray-600">
                &copy; {new Date().getFullYear()} Performance Dashboard. All rights reserved.
            </footer>
        </div>
    );
}