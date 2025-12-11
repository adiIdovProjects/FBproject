'use client';

/**
 * Purpose: Fetches the daily breakdown data from the API and visualizes 
 * Spend and Purchases over time using Recharts.
 * * Functions:
 * - fetchData: Fetches data using the date filters passed as props and formats 
 * the 'date' field for clean axis labels.
 * * How to Use:
 * Receives 'startDate' and 'endDate' as props.
 */

import React, { useState, useEffect } from 'react';
// ה-DailyKpi אינו הכרחי אם משתמשים ב-any[]
// import { DailyKpi } from '@/types'; 
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// CRITICAL: Use the /core_summary/ endpoint for filtered data
// ✅ תיקון: הגדרת בסיס ה-URL בלבד
const BASE_API_URL = 'http://127.0.0.1:8000/api/reports/core_summary/';

interface DailyChartProps {
    startDate: string | null;
    endDate: string | null;
}

const DailyChart: React.FC<DailyChartProps> = ({ startDate, endDate }) => {
    // שינוי ל-any[] מכיוון שמבנה ה-JSON חזר עם total_spend ו-total_purchases
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            
            // Build the query string with date parameters
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            try {
                // ✅ תיקון: שימוש ב-BASE_API_URL והוספת הפרמטרים
                const apiUrl = `${BASE_API_URL}?${params.toString()}`;
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    // ננסה לקרוא את גוף השגיאה אם הוא קיים
                    const errorText = await response.text();
                    throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 100)}`);
                }
                const dailyData: any[] = await response.json();

                // Format the date for cleaner chart axis display
                const formattedData = dailyData.map(item => ({
                    ...item,
                    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                }));
                
                setData(formattedData);
            } catch (e: any) {
                // חשוב לוודא שזה מטפל גם בשגיאות רשת, לא רק שגיאות HTTP
                setError(`שגיאה בטעינת נתונים: וודא ששרת ה-API פועל (http://127.0.0.1:8000). פרטי השגיאה: ${e.message}`);
                console.error("Fetch error in DailyChart:", e);
                setData([]); // נקה נתונים במקרה של שגיאה
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate]); // CRITICAL: Rerun fetch when dates change

    // --- Rendering ---
    if (isLoading) {
        return <div className="p-6 text-center text-gray-600 animate-pulse">טוען נתונים יומיים...</div>;
    }

    if (error) {
        return <div className="p-6 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg">שגיאה בטעינת הגרף: {error}</div>;
    }
    
    // ✅ תיקון: הצגת הודעה כאשר אין נתונים
    if (data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg mt-8 text-center text-gray-500">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">ביצועים יומיים</h2>
                <p>⚠️ אין נתונים זמינים עבור טווח התאריכים הנבחר.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">ביצועים יומיים</h2>
            <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="date" />
                        
                        {/* Left Axis: Spend (הוצאה) */}
                        <YAxis 
                            yAxisId="left" 
                            stroke="#8884d8" 
                            orientation="left" 
                            label={{ value: 'הוצאה (₪)', angle: -90, position: 'insideLeft' }} 
                            // הוספת פורמט כספי
                            tickFormatter={(value) => `${value.toLocaleString('he-IL', { style: 'currency', currency: 'ILS' }).replace('ILS', '₪')}`}
                        />
                        
                        {/* Right Axis: Purchases (רכישות) */}
                        <YAxis 
                            yAxisId="right" 
                            stroke="#82ca9d" 
                            orientation="right" 
                            label={{ value: 'רכישות', angle: 90, position: 'insideRight' }} 
                        />
                        
                        <Tooltip 
                            // שינוי תצוגת התווית
                            formatter={(value: any, name: string) => {
                                // עיצוב כספי להוצאה
                                if (name === 'הוצאה (₪)') {
                                    return [value.toLocaleString('he-IL', { style: 'currency', currency: 'ILS' }).replace('ILS', '₪'), name];
                                }
                                // עיצוב מספר רגיל לרכישות
                                return [value.toLocaleString('he-IL'), name];
                            }}
                            labelFormatter={(label) => `תאריך: ${label}`}
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                        
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        
                        {/* שימוש ב-dataKey הנכון מה-API: total_spend והוספת name לתווית */}
                        <Line yAxisId="left" type="monotone" dataKey="total_spend" name="הוצאה (₪)" stroke="#8884d8" dot={false} strokeWidth={2} />
                        
                        {/* שימוש ב-dataKey הנכון מה-API: total_purchases והוספת name לתווית */}
                        <Line yAxisId="right" type="monotone" dataKey="total_purchases" name="רכישות" stroke="#82ca9d" dot={false} strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DailyChart;