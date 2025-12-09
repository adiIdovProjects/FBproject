// src/app/page.tsx

'use client'; 

/**
 * Purpose: The main dashboard page component. It acts as the central state 
 * manager, holding the selected date range and passing it down to all 
 * components that require filtering (KPIs, Charts, Tables).
 * * Functions:
 * - Home: The main functional component using useState for date management.
 * - handleDateRangeChange: Callback function to update the central date state,
 * triggering re-renders and data fetching in child components.
 * * How to Use:
 * Renders the DateFilter first, followed by components that receive the date filters.
 */

import React, { useState, Suspense, useMemo } from 'react'; 
import DateFilter from '@/components/DateFilter'; 

// ✅ שימוש בייבוא דינמי כדי לפתור בעיות TypeScript/Client Component Props
import dynamic from 'next/dynamic';

// --- ✅ תיקון קריטי לבעיית TypeScript: הגדרת הממשק במפורש ---
interface KpiProps {
    startDate: string | null;
    endDate: string | null;
}
// -----------------------------------------------------------------

// הגדרת ה-Dynamic Import, כעת עם ציון ה-Props
const KpiContainer = dynamic<KpiProps>(() => import('@/components/KpiContainer'), { ssr: false });
const DailyChart = dynamic<KpiProps>(() => import('@/components/DailyChart'), { ssr: false });

// שינוי ל-function Home רגילה במקום default export Home:
export default function Home() {
	// State to manage the selected date range
	const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({
		startDate: null,
		endDate: null
	});

	// Function to update the date state from the DateFilter
	const handleDateRangeChange = (startDate: string | null, endDate: string | null) => {
		setDateRange({ startDate, endDate });
	};
	
	// שימוש ב-useMemo כדי למנוע יצירה מחדש של ה-Props בכל רינדור
	const kpiProps = useMemo<KpiProps>(() => ({
		startDate: dateRange.startDate,
		endDate: dateRange.endDate
	}), [dateRange.startDate, dateRange.endDate]);
	
	return (
		<main className="min-h-screen bg-gray-100 p-6">
			<h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
				📊 Meta Ads Dashboard
			</h1>
			
			{/* 1. Date Filter (The controller) */}
			<DateFilter onDateRangeChange={handleDateRangeChange} />

			<Suspense fallback={<div className="text-center p-8">טוען נתוני דאשבורד...</div>}>
				{/* 2. KPI Container (Receives the dates for filtering) */}
				<KpiContainer 
					{...kpiProps}
				/>
				
				{/* 3. Daily Chart (Receives the dates for filtering) */}
				<DailyChart 
					{...kpiProps}
				/>
			</Suspense>
			
			{/* 4. DetailedReportTable will be added here later */}
			
		</main>
	);
}