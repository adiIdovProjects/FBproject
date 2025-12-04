// src/components/DateFilter.tsx

"use client";

import React, { useState } from 'react';

// הגדרת הממשק של ה-Props שהרכיב הזה מקבל
interface DateFilterProps {
  // הפונקציה שאחראית לשלוח את התאריכים שנבחרו לרכיבים אחרים
  onDateRangeChange: (startDate: string | null, endDate: string | null) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ onDateRangeChange }) => {
  // ניהול המצב המקומי של התאריכים בתוך הרכיב
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // פונקציה המופעלת בלחיצה על 'סנן'
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // מונע טעינה מחדש של הדף
    
    // קוראים לפונקציה שהועברה ב-Props ומעבירים לה את הערכים הנבחרים
    // אם הערכים ריקים, אנחנו שולחים null
    onDateRangeChange(
      startDate || null, 
      endDate || null
    );
  };

  // פונקציה המופעלת בלחיצה על 'נקה'
  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    // שולחים null כדי לאותת לרכיבים האחרים לבצע קריאה ללא סינון (כל הנתונים)
    onDateRangeChange(null, null);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-6 max-w-7xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
        
        {/* קלט תאריך התחלה */}
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">תאריך התחלה</label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        {/* קלט תאריך סיום */}
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">תאריך סיום</label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        {/* כפתור סינון */}
        <button
          type="submit"
          className="sm:mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 transition duration-150"
        >
          סנן נתונים
        </button>

        {/* כפתור ניקוי */}
        <button
          type="button"
          onClick={handleClear}
          className="sm:mt-4 px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md shadow hover:bg-gray-400 transition duration-150"
        >
          נקה סינון
        </button>
      </form>
    </div>
  );
};

export default DateFilter;