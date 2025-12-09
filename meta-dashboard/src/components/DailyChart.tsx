// src/components/DailyChart.tsx

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
import { DailyKpi } from '@/types';
import { 
	LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// CRITICAL: Use the /core_summary/ endpoint for filtered data
const API_URL = 'http://127.0.0.1:8000/api/reports/core_summary/';

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
				const response = await fetch(`${API_URL}?${params.toString()}`); // Use the URL with parameters
				
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const dailyData: any[] = await response.json();

				// Format the date for cleaner chart axis display
				const formattedData = dailyData.map(item => ({
					...item,
					date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
				}));
				
				setData(formattedData);
			} catch (e: any) {
				setError(`Failed to fetch daily data: ${e.message}`);
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [startDate, endDate]); // CRITICAL: Rerun fetch when dates change

	// --- Rendering ---
	if (isLoading) {
		return <div className="p-6 text-center">טוען נתונים יומיים...</div>;
	}

	if (error) {
		return <div className="p-6 text-center text-red-600">שגיאה בטעינת הגרף: {error}</div>;
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
							formatter={(value, name) => [value, name === 'total_spend' ? 'הוצאה (₪)' : 'רכישות']}
							labelFormatter={(label) => `תאריך: ${label}`}
						/>
						
						{/* ✅ תיקון: הסרת הפרופ payload המיותר. ה-Legend יציג את תוויות ה-Line. */}
						<Legend />
						
						{/* ✅ שימוש ב-dataKey הנכון מה-API: total_spend והוספת name לתווית */}
						<Line yAxisId="left" type="monotone" dataKey="total_spend" name="הוצאה (₪)" stroke="#8884d8" dot={false} strokeWidth={2} />
						
						{/* ✅ שימוש ב-dataKey הנכון מה-API: total_purchases והוספת name לתווית */}
						<Line yAxisId="right" type="monotone" dataKey="total_purchases" name="רכישות" stroke="#82ca9d" dot={false} strokeWidth={2} />
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export default DailyChart;