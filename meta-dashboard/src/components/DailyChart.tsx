// src/components/DailyChart.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { DailyKpi } from '@/types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const API_URL = 'http://127.0.0.1:8000/api/kpis/daily';

const DailyChart: React.FC = () => {
  const [data, setData] = useState<DailyKpi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const dailyData: DailyKpi[] = await response.json();

        // פורמט התאריך לטובת התצוגה בגרף
        const formattedData = dailyData.map(item => ({
          ...item,
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }));
        
        setData(formattedData);
      } catch (e: any) {
        setError(`Failed to fetch daily data: ${e.message}`);
        console.error("Daily API Fetch Error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <div className="p-6 text-center">טוען נתונים יומיים...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">שגיאה בטעינת גרף: {error}</div>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">ביצועים יומיים</h2>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" stroke="#8884d8" orientation="left" label={{ value: 'הוצאה (₪)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" stroke="#82ca9d" orientation="right" label={{ value: 'רכישות', angle: 90, position: 'insideRight' }} />
            <Tooltip 
              formatter={(value, name) => [value, name === 'spend' ? 'הוצאה (₪)' : 'רכישות']}
              labelFormatter={(label) => `תאריך: ${label}`}
            />
            <Legend />
            {/* הוצאה (Spend) - בציר שמאל */}
            <Line yAxisId="left" type="monotone" dataKey="spend" name="spend" stroke="#8884d8" dot={false} strokeWidth={2} />
            {/* רכישות (Purchases) - בציר ימין */}
            <Line yAxisId="right" type="monotone" dataKey="purchases" name="purchases" stroke="#82ca9d" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DailyChart;