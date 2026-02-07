"use client";

/**
 * FunnelStages - Visual funnel with editable stage names
 * Click on stage name to edit inline
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';

interface FunnelStagesProps {
    stages: string[];
    counts: Record<number, number>;
    onStageNameUpdate: (index: number, newName: string) => void;
}

export default function FunnelStages({ stages, counts, onStageNameUpdate }: FunnelStagesProps) {
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleStartEdit = (index: number) => {
        setEditingIndex(index);
        setEditValue(stages[index]);
    };

    const handleSaveEdit = () => {
        if (editingIndex !== null && editValue.trim()) {
            onStageNameUpdate(editingIndex, editValue.trim());
        }
        setEditingIndex(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            setEditingIndex(null);
        }
    };

    // Stage colors for visual distinction
    const stageColors = [
        'from-blue-500 to-blue-600',
        'from-cyan-500 to-cyan-600',
        'from-teal-500 to-teal-600',
        'from-emerald-500 to-emerald-600',
        'from-green-500 to-green-600',
    ];

    return (
        <div className="bg-card border border-border-subtle rounded-xl p-4">
            <div className={`flex items-center justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {stages.map((stage, index) => (
                    <div key={index} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {/* Stage Card */}
                        <div
                            className={`flex-1 min-w-[120px] bg-gradient-to-br ${stageColors[index]} rounded-xl p-3 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all`}
                            onClick={() => handleStartEdit(index)}
                        >
                            {editingIndex === index ? (
                                <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                    className="w-full bg-white/20 text-white placeholder-white/50 px-2 py-1 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            ) : (
                                <div className="text-sm font-medium truncate" title="Click to rename">
                                    {stage}
                                </div>
                            )}
                            <div className="text-2xl font-bold mt-1">
                                {counts[index] || 0}
                            </div>
                        </div>

                        {/* Arrow between stages */}
                        {index < stages.length - 1 && (
                            <ChevronRight className={`w-5 h-5 text-text-muted flex-shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
