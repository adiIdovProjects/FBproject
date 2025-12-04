// src/components/KpiContainer.tsx

"use client"; // חובה ב-Next.js כדי להשתמש ב-Hooks כמו useState ו-useEffect

import React, { useState, useEffect } from 'react';
import KpiCard from './KpiCard';
import { KpiSummary } from '@/types'; // ייבוא הממשק שיצרנו

// הכתובת של FastAPI API שפועל בטרמינל הנפרד על פורט 8000
const API_URL = 'http://127.0.0.1:8000/api/kpis/summary';

/**
 * רכיב שמנהל את מצב קריאת הנתונים מה-API ומציג את כרטיסי ה-KPI.
 */
const KpiContainer: React.FC = () => {
  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: KpiSummary = await response.json();
        setKpis(data);
        
      } catch (e: any) {
        setError(`Failed to fetch data from API: ${e.message}`);
        console.error("API Fetch Error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKpis();
  }, []); // ריצה פעם אחת בטעינה ראשונית

  // --- תנאי רינדור (Rendering) ---
  if (isLoading) {
    return (
      <div className="p-6 text-center text-xl text-blue-500">
        טוען נתונים...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 border border-red-300 bg-red-50 rounded-lg m-4">
        שגיאה בטעינת נתונים: {error}
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="p-6 text-center text-gray-500">
        לא נמצאו נתונים להצגה.
      </div>
    );
  }

  // --- הצגת ה-KPIs (הצלחה) ---
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 p-6 max-w-7xl mx-auto">
      <KpiCard 
        title="סך הוצאה (Total Spend)" 
        value={kpis.total_spend} 
        unit="₪" 
        className="bg-red-50" 
      />
      <KpiCard 
        title="סך רכישות (Total Purchases)" 
        value={kpis.total_purchases} 
        unit="" // לא יחידה כספית
        className="bg-green-50" 
      />
      <KpiCard 
        title="עלות לרכישה (CPA)" 
        value={kpis.cpa} 
        unit="₪" 
        className="bg-yellow-50" 
      />
    </div>
  );
};

export default KpiContainer;