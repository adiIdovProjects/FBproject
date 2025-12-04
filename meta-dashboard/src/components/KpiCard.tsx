// src/components/KpiCard.tsx

import React from 'react';

interface KpiCardProps {
  title: string;
  value: number;
  unit?: string;
  className?: string;
}

/**
 * רכיב להצגת KPI בודד עם עיצוב נקי ו-Tailwind CSS.
 */
const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit = '', className = '' }) => {
  // פונקציה לעיצוב המספרים עם פסיקים
  const formattedValue = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className={`p-6 rounded-lg shadow-lg ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
      <div className="mt-1 flex items-baseline">
        <p className="text-3xl font-bold text-gray-900">
          {unit} {formattedValue}
        </p>
      </div>
    </div>
  );
};

export default KpiCard;