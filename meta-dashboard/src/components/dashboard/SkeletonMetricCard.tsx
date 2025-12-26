/**
 * SkeletonMetricCard Component
 * Displays a placeholder while a MetricCard is loading
 */

import React from 'react';
import { Card } from '@tremor/react';

export const SkeletonMetricCard: React.FC = () => {
    return (
        <Card className="bg-gray-800 border-gray-700 animate-pulse" decoration="top" decorationColor="gray">
            <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-24 bg-gray-700 rounded"></div>
                <div className="p-2 bg-gray-700 rounded-lg w-9 h-9"></div>
            </div>
            <div className="space-y-4">
                <div className="h-8 w-32 bg-gray-700 rounded"></div>
                <div className="h-4 w-16 bg-gray-700 rounded"></div>
            </div>
        </Card>
    );
};

export default SkeletonMetricCard;
