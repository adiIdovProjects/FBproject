// src/components/KpiCard.tsx

/**
 * Purpose: A simple, reusable presentation component for displaying a single 
 * Key Performance Indicator (KPI) with its value, unit, and styling.
 * * Functions:
 * - formattedValue: Formats the numerical value with commas and two decimal places.
 * * How to Use:
 * Pass title (string), value (number), and optional unit/className (string) as props.
 */

import React from 'react';

interface KpiCardProps {
  title: string;
  value: number;
  unit?: string;
  className?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit = '', className = '' }) => {
  // Function to format the number with commas and 2 decimal places
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