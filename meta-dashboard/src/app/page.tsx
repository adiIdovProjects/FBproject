// src/app/page.tsx

import KpiContainer from '@/components/KpiContainer';
import DailyChart from '@/components/DailyChart'; 

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
        📊 Meta Ads Dashboard
      </h1>
      
      {/* 1. כרטיסי ה-KPI (כבר עובד) */}
      <KpiContainer />
      
      {/* 2. הגרף היומי החדש */}
      <DailyChart />
      
    </main>
  );
}