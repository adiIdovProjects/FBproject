"use client";

import React, { useState, useEffect } from 'react';
// Assuming KpiCard is available or imported in the main app context

// נשנה את הכתובת ל-localhost כדי למנוע בעיות CORS פוטנציאליות עם 127.0.0.1
const API_URL = 'http://localhost:8000/api/reports/core_summary/'; 

interface KpiSummary {
    totalSpend: number;
    totalPurchases: number;
    totalClicks: number;
    cpa: number;
    ctr: number;
    cpc: number;
}

interface KpiContainerProps {
    startDate: string | null;
    endDate: string | null;
}

/**
 * Component that manages fetching data from the API and displays the KPI cards.
 */
const KpiContainer: React.FC<KpiContainerProps> = ({ startDate, endDate }) => {
    // --- LOUD LOG TO CHECK COMPONENT LOADING ---
    console.log("DEBUG [COMPONENT LOAD]: KpiContainer הופעל ונמצא בשימוש.");

    // --- State Initialization ---
    const initialKpis: KpiSummary = {
        totalSpend: 0, totalPurchases: 0, totalClicks: 0,
        cpa: 0, ctr: 0, cpc: 0,
    };
    const [kpis, setKpis] = useState<KpiSummary | null>(initialKpis);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUrl = API_URL;

    // --- Utility Functions ---

    const getNumericValue = (item: any, keys: string[]): number => {
        for (const key of keys) {
            const value = item[key];
            if (value !== undefined && value !== null) {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    return num;
                }
            }
        }
        return 0;
    };

    const calculateSummary = (dailyData: any[]): KpiSummary => {
        if (dailyData.length > 0) {
             console.log("DEBUG [FIRST ITEM STRUCTURE]: מבנה הפריט הראשון:", dailyData[0]);
        }
        
        const spendKeys = ['total_spend', 'totalSpend', 'spend'];
        const purchaseKeys = ['total_purchases', 'totalPurchases', 'purchases'];

        const totalSpend = dailyData.reduce((sum, item) => sum + getNumericValue(item, spendKeys), 0);
        const totalPurchases = dailyData.reduce((sum, item) => sum + getNumericValue(item, purchaseKeys), 0);
        
        const cpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;

        console.log("DEBUG [SUMMARY]: הסכומים המחושבים:", { 
            totalSpend, totalPurchases, cpa,
            totalClicks: 0, ctr: 0, cpc: 0,
        });
        
        return {
            totalSpend: totalSpend,
            totalPurchases: totalPurchases,
            cpa: cpa,
            totalClicks: 0,
            ctr: 0,
            cpc: 0,
        } as KpiSummary; 
    };

    // --- Effect Hook for Data Fetching ---

    useEffect(() => {
        console.log("DEBUG [EFFECT START]: הפעלת useEffect. מתחילים בטעינת נתונים.");
        
        const fetchKpis = async () => {
            setIsLoading(true);
            setError(null);

            console.log("DEBUG [URL]: ה-URL הקבוע ל-API הוא:", fetchUrl);

            try {
                // בדיקה אם השרת מוכן (אמולציה של בדיקת חיבור, למרות שה-fetch אמור לטפל בזה)
                if (fetchUrl.includes('localhost:8000')) {
                    // אין באמת דרך לבדוק שהשרת רץ פרט לניסיון ה-fetch
                    console.log("DEBUG [PRE-FETCH]: מנסה לבצע fetch ל-API...");
                }

                const response = await fetch(fetchUrl);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);
                }
                
                console.log("DEBUG [RESPONSE OK]: התקבלה תגובה תקינה מה-API.");

                const data: any[] = await response.json(); 
                
                console.log("DEBUG [RAW DATA]: הנתונים הגולמיים שהתקבלו:", data);

                if (data && Array.isArray(data) && data.length > 0) {
                    const summary = calculateSummary(data);
                    setKpis(summary);
                } else {
                    console.log("DEBUG [EMPTY]: מערך הנתונים ריק או לא תקין.");
                    setKpis(initialKpis); 
                }

            } catch (e: any) {
                // שגיאה זו יכולה להיות בעיית CORS, שרת API לא מחובר, או כתובת לא נכונה
                setError(`Failed to fetch data from API (Check API Server and CORS): ${e.message}`);
                console.error("API Fetch Error:", e);
                setKpis(initialKpis);
            } finally {
                setIsLoading(false);
            }
        };

        // Fetch data immediately when the component mounts
        fetchKpis();
    }, [fetchUrl]); 

    // --- Rendering ---
    
    // סופר פשוט KpiCard זמני לצורך בדיקה
    const KpiCard = ({ title, value, unit, className }: { title: string, value: number, unit: string, className: string }) => (
        <div className={`p-5 rounded-xl shadow-lg transition-shadow duration-300 hover:shadow-xl ${className} border border-gray-100`}>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 flex flex-row-reverse justify-end items-baseline">
                {unit} {value.toLocaleString('he-IL')}
            </p>
        </div>
    );

    if (isLoading) {
        return (
            <div className="p-6 text-center text-xl text-blue-500 font-semibold">
                טוען נתונים...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 border border-red-300 bg-red-50 rounded-lg m-4 shadow-md">
                <p className="font-bold text-lg">שגיאה בטעינת הנתונים</p>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-xs mt-2">וודא שה-API שלך רץ על http://localhost:8000 ושתומך ב-CORS.</p>
            </div>
        );
    }

    if (!kpis || (kpis.totalSpend === 0 && kpis.totalPurchases === 0)) {
        return (
            <div className="p-6 text-center text-gray-500 italic">
                לא נמצאו נתונים להצגה (או שהמדדים שווים לאפס).
            </div>
        );
    }

    // --- Display KPIs (Success) ---
    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 p-6 max-w-7xl mx-auto">
            <KpiCard 
                title="סך ההוצאה" 
                value={parseFloat(kpis.totalSpend.toFixed(2))}
                unit="₪" 
                className="bg-red-50" 
            />
            <KpiCard 
                title="סך הרכישות" 
                value={Math.round(kpis.totalPurchases)} 
                unit="" 
                className="bg-green-50" 
            />
            <KpiCard 
                title="עלות לרכישה (CPA)" 
                value={parseFloat(kpis.cpa.toFixed(2))}
                unit="₪" 
                className="bg-yellow-50" 
            />
        </div>
    );
};

export default KpiContainer;