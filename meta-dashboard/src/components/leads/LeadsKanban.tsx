"use client";

/**
 * LeadsKanban - Drag-and-drop kanban board for leads
 * Cards show name with tooltip for email/phone
 */

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { User, GripVertical } from 'lucide-react';

interface LeadsKanbanProps {
    leads: Record<string, string>[];
    leadStages: Record<string, number>;
    stageNames: string[];
    isLoading: boolean;
    onStageUpdate: (leadId: string, stageIndex: number) => void;
}

export default function LeadsKanban({
    leads,
    leadStages,
    stageNames,
    isLoading,
    onStageUpdate
}: LeadsKanbanProps) {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';

    // Track which lead is being dragged
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    // Track which column is being hovered
    const [dragOverStage, setDragOverStage] = useState<number | null>(null);

    // Stage colors matching FunnelStages
    const stageColors = [
        'border-blue-500',
        'border-cyan-500',
        'border-teal-500',
        'border-emerald-500',
        'border-green-500',
        'border-red-500',
    ];

    const stageBgColors = [
        'bg-blue-500/10',
        'bg-cyan-500/10',
        'bg-teal-500/10',
        'bg-emerald-500/10',
        'bg-green-500/10',
        'bg-red-500/10',
    ];

    // Group leads by stage
    const leadsByStage: Record<number, Record<string, string>[]> = {};
    stageNames.forEach((_, index) => {
        leadsByStage[index] = [];
    });
    leads.forEach(lead => {
        const stage = leadStages[lead.id] ?? 0;
        if (leadsByStage[stage]) {
            leadsByStage[stage].push(lead);
        }
    });

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        setDraggedLeadId(leadId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', leadId);
    };

    const handleDragEnd = () => {
        setDraggedLeadId(null);
        setDragOverStage(null);
    };

    const handleDragOver = (e: React.DragEvent, stageIndex: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverStage(stageIndex);
    };

    const handleDragLeave = () => {
        setDragOverStage(null);
    };

    const handleDrop = (e: React.DragEvent, stageIndex: number) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('text/plain');
        if (leadId && leadStages[leadId] !== stageIndex) {
            onStageUpdate(leadId, stageIndex);
        }
        setDraggedLeadId(null);
        setDragOverStage(null);
    };

    if (isLoading) {
        return (
            <div className="bg-card border border-border-subtle rounded-xl p-8">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                    <span className="ml-3 text-text-muted">{t('common.loading') || 'Loading...'}</span>
                </div>
            </div>
        );
    }

    if (leads.length === 0) {
        return (
            <div className="bg-card border border-border-subtle rounded-xl p-8 text-center">
                <User className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">{t('leads.no_leads') || 'No leads found for this form'}</p>
            </div>
        );
    }

    return (
        <div className={`flex gap-4 overflow-x-auto pb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {stageNames.map((stageName, stageIndex) => (
                <div
                    key={stageIndex}
                    className={`flex-shrink-0 w-64 bg-card border-2 rounded-xl transition-all ${
                        dragOverStage === stageIndex
                            ? `${stageColors[stageIndex]} ${stageBgColors[stageIndex]}`
                            : 'border-border-subtle'
                    }`}
                    onDragOver={(e) => handleDragOver(e, stageIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stageIndex)}
                >
                    {/* Column Header */}
                    <div className={`px-3 py-2 border-b border-border-subtle ${stageBgColors[stageIndex]}`}>
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground text-sm">{stageName}</span>
                            <span className="text-xs text-text-muted bg-secondary px-2 py-0.5 rounded-full">
                                {leadsByStage[stageIndex]?.length || 0}
                            </span>
                        </div>
                    </div>

                    {/* Cards Container */}
                    <div className="p-2 space-y-2 min-h-[200px]">
                        {leadsByStage[stageIndex]?.map(lead => (
                            <div
                                key={lead.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, lead.id)}
                                onDragEnd={handleDragEnd}
                                className={`group relative bg-secondary hover:bg-secondary-hover border border-border-subtle rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
                                    draggedLeadId === lead.id ? 'opacity-50 scale-95' : ''
                                }`}
                                title={`${lead.email || ''}\n${lead.phone_number || ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    <span className="text-sm text-foreground truncate">
                                        {lead.full_name || t('leads.unnamed') || 'Unnamed'}
                                    </span>
                                </div>

                                {/* Tooltip on hover */}
                                <div className="absolute left-0 right-0 top-full mt-1 z-10 hidden group-hover:block">
                                    <div className="bg-card border border-border-subtle rounded-lg shadow-lg p-2 text-xs">
                                        {lead.email && (
                                            <div className="text-text-muted truncate">{lead.email}</div>
                                        )}
                                        {lead.phone_number && (
                                            <div className="text-text-muted">{lead.phone_number}</div>
                                        )}
                                        {!lead.email && !lead.phone_number && (
                                            <div className="text-text-muted italic">
                                                {t('leads.no_contact') || 'No contact info'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Empty state for column */}
                        {(!leadsByStage[stageIndex] || leadsByStage[stageIndex].length === 0) && (
                            <div className="text-center py-8 text-text-muted text-xs">
                                {t('leads.drop_here') || 'Drop leads here'}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
