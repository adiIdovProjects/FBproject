// src/components/DateFilter.tsx

"use client";

/**
 * Purpose: Provides a user interface for selecting a date range (start and end date).
 * It manages its own local state for the dates and uses a callback function 
 * (onDateRangeChange) to communicate the selected filter values to the parent component.
 * * Functions:
 * - handleSubmit: Prevents form submission and calls the parent callback with the selected dates.
 * - handleClear: Clears the local state and sends null values to the parent callback, 
 * indicating that no date filtering should be applied.
 * * How to Use:
 * Pass the onDateRangeChange function from the parent component (page.tsx).
 */

import React, { useState } from 'react';

// Define the interface for the component's props
interface DateFilterProps {
  // Callback function to pass selected dates back to the parent component
  onDateRangeChange: (startDate: string | null, endDate: string | null) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ onDateRangeChange }) => {
  // Local state management for the input fields
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Function triggered on 'Filter' button click
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); 
    
    // Send the selected values (or null if fields are empty) to the parent
    onDateRangeChange(
      startDate || null, 
      endDate || null
    );
  };

  // Function triggered on 'Clear' button click
  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    // Send null to remove all filters
    onDateRangeChange(null, null);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-6 max-w-7xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
        
        {/* Start Date Input */}
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        {/* End Date Input */}
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        {/* Filter Button */}
        <button
          type="submit"
          className="sm:mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 transition duration-150"
        >
          Filter Data
        </button>

        {/* Clear Button */}
        <button
          type="button"
          onClick={handleClear}
          className="sm:mt-4 px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md shadow hover:bg-gray-400 transition duration-150"
        >
          Clear Filter
        </button>
      </form>
    </div>
  );
};

export default DateFilter;
