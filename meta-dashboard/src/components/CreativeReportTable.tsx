    // src/components/CreativeReportTable.tsx

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { CreativeMetric } from '@/types'; // Import the new interface

// The URL for the new API endpoint
const API_URL = 'http://127.0.0.1:8000/api/reports/creative_breakdown/';

interface CreativeReportTableProps {
    startDate: string | null;
    endDate: string | null;
}

/**
 * Component that displays the breakdown report by Creative (Ad).
 * It uses startDate and endDate for filtering.
 */
const CreativeReportTable: React.FC<CreativeReportTableProps> = ({ startDate, endDate }) => {
    const [data, setData] = useState<CreativeMetric[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Creates the API URL with filtering parameters
    const fetchUrl = useMemo(() => {
        let url = API_URL;
        const params = new URLSearchParams();

        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        // campaign_name filter is omitted for initial simplicity
        
        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
        return url;
    }, [startDate, endDate]);

    useEffect(() => {
        // Prevent data fetching if no date range is selected
        if (!startDate || !endDate) {
            setData([]); 
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const response = await fetch(fetchUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result: CreativeMetric[] = await response.json();
                setData(result);
                
            } catch (e: any) {
                setError(`Failed to fetch creative data: ${e.message}`);
                console.error("API Fetch Error:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [fetchUrl, startDate, endDate]); 

    // --- Rendering Conditions ---
    if (isLoading) {
        return <div className="p-4 text-center text-blue-500">Loading Creative Report Data...</div>;
    }

    if (error) {
        return (
            <div className="p-4 text-center text-red-600 border border-red-300 bg-red-50 rounded-lg m-4">
                Error Loading Creative Data: {error}
            </div>
        );
    }
    
    // Display message if no date range is selected or no data is found
    if (data.length === 0) {
        return (
            <div className="max-w-7xl mx-auto p-6 mt-8">
                <div className="p-4 text-center text-gray-500 border border-gray-300 bg-white rounded-lg">
                    {startDate && endDate ? 'No creative data found for the selected date range.' : 'Select a date range to view the Creative Report.'}
                </div>
            </div>
        );
    }

    // --- Data Table ---
    const formatCurrency = (value: number) => `₪${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
    const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });


    return (
        <div className="max-w-7xl mx-auto mt-8 bg-white p-6 rounded-lg shadow-xl overflow-x-auto">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Creative Breakdown Report</h2>
            <table className="min-w-full divide-y divide-gray-200 text-right">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Creative Name</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Spend</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Purchases</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Impressions</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Clicks</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">CTR</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">CPC</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">CPA</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{item.creative_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.total_spend)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(item.total_purchases)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(item.total_impressions)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(item.total_clicks)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatPercent(item.CTR)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.CPC)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.CPA)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CreativeReportTable;