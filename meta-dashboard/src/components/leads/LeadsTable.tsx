"use client";

/**
 * LeadsTable - Display leads with stage dropdown
 */

import { useTranslations, useLocale } from 'next-intl';
import { User, Mail, Phone, Calendar } from 'lucide-react';

interface LeadsTableProps {
    leads: Record<string, string>[];
    leadStages: Record<string, number>;
    stageNames: string[];
    isLoading: boolean;
    onStageUpdate: (leadId: string, stageIndex: number) => void;
}

export default function LeadsTable({
    leads,
    leadStages,
    stageNames,
    isLoading,
    onStageUpdate
}: LeadsTableProps) {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';

    // Common field names to display (prioritized order)
    const priorityFields = ['full_name', 'email', 'phone_number', 'created_time'];

    // Get all unique field names from leads (excluding id and priority fields)
    const otherFields = leads.length > 0
        ? [...new Set(leads.flatMap(lead => Object.keys(lead)))]
            .filter(key => !['id', ...priorityFields].includes(key))
            .sort()
        : [];

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
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
        <div className="bg-card border border-border-subtle rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-secondary/50 border-b border-border-subtle">
                            <th className={`px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    {t('leads.name') || 'Name'}
                                </div>
                            </th>
                            <th className={`px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {t('leads.email') || 'Email'}
                                </div>
                            </th>
                            <th className={`px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    {t('leads.phone') || 'Phone'}
                                </div>
                            </th>
                            <th className={`px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {t('leads.date') || 'Date'}
                                </div>
                            </th>
                            {/* Other fields */}
                            {otherFields.slice(0, 3).map(field => (
                                <th key={field} className={`px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                                    {field.replace(/_/g, ' ')}
                                </th>
                            ))}
                            <th className={`px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                                {t('leads.stage') || 'Stage'}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {leads.map((lead) => {
                            const currentStage = leadStages[lead.id] ?? 0;

                            return (
                                <tr key={lead.id} className="hover:bg-secondary/30 transition-colors">
                                    <td className="px-4 py-3 text-sm text-foreground">
                                        {lead.full_name || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-foreground">
                                        {lead.email || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-foreground">
                                        {lead.phone_number || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-text-muted">
                                        {lead.created_time ? formatDate(lead.created_time) : '-'}
                                    </td>
                                    {/* Other fields */}
                                    {otherFields.slice(0, 3).map(field => (
                                        <td key={field} className="px-4 py-3 text-sm text-foreground">
                                            {lead[field] || '-'}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3">
                                        <select
                                            value={currentStage}
                                            onChange={(e) => onStageUpdate(lead.id, parseInt(e.target.value))}
                                            className="px-3 py-1.5 bg-secondary border border-border-subtle rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                                        >
                                            {stageNames.map((stage, index) => (
                                                <option key={index} value={index}>
                                                    {stage}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer with count */}
            <div className="px-4 py-3 bg-secondary/30 border-t border-border-subtle text-sm text-text-muted">
                {t('leads.total_leads', { count: leads.length }) || `${leads.length} leads`}
            </div>
        </div>
    );
}
