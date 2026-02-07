"use client";

/**
 * Leads Page - View and manage leads from lead forms
 * Shows funnel stages, leads table, and CSV export
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Download, Info, Users } from 'lucide-react';
import { MainLayout } from '../../../components/MainLayout';
import { useAccount } from '../../../context/AccountContext';
import { mutationsService } from '../../../services/mutations.service';
import FunnelStages from '../../../components/leads/FunnelStages';
import LeadsTable from '../../../components/leads/LeadsTable';

interface LeadForm {
    id: string;
    name: string;
    status: string;
    created_time?: string;
}

export default function LeadsPage() {
    const t = useTranslations();
    const locale = useLocale();
    const { selectedAccountId, linkedAccounts } = useAccount();

    // State
    const [leadForms, setLeadForms] = useState<LeadForm[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [leads, setLeads] = useState<Record<string, string>[]>([]);
    const [leadStages, setLeadStages] = useState<Record<string, number>>({});
    const [stageNames, setStageNames] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Date range (last 30 days)
    const { startDate, endDate } = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
        };
    }, []);

    // Get page ID from selected account
    const pageId = useMemo(() => {
        const account = linkedAccounts.find(a => a.account_id === selectedAccountId);
        return account?.page_id || '';
    }, [linkedAccounts, selectedAccountId]);

    // Load lead forms on mount
    useEffect(() => {
        if (!pageId || !selectedAccountId) return;

        const loadForms = async () => {
            try {
                const forms = await mutationsService.getLeadForms(pageId, String(selectedAccountId));
                setLeadForms(forms);
                if (forms.length > 0) {
                    setSelectedFormId(forms[0].id);
                }
            } catch (err) {
                console.error('Failed to load lead forms:', err);
            }
        };

        loadForms();
    }, [pageId, selectedAccountId]);

    // Load funnel stages
    useEffect(() => {
        if (!selectedAccountId) return;

        const loadStages = async () => {
            try {
                const response = await mutationsService.getFunnelStages(String(selectedAccountId));
                setStageNames(response.stages);
            } catch (err) {
                console.error('Failed to load funnel stages:', err);
            }
        };

        loadStages();
    }, [selectedAccountId]);

    // Load leads when form is selected
    useEffect(() => {
        if (!selectedFormId || !pageId || !selectedAccountId) return;

        const loadLeads = async () => {
            setIsLoading(true);
            try {
                const [leadsResponse, stagesResponse] = await Promise.all([
                    mutationsService.getLeads(selectedFormId, pageId, String(selectedAccountId), startDate, endDate),
                    mutationsService.getLeadStages(String(selectedAccountId), selectedFormId)
                ]);
                setLeads(leadsResponse.leads);
                setLeadStages(stagesResponse.stages);
            } catch (err) {
                console.error('Failed to load leads:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadLeads();
    }, [selectedFormId, pageId, selectedAccountId, startDate, endDate]);

    // Handle CSV export
    const handleExport = async () => {
        if (!selectedFormId || !pageId) return;

        setIsExporting(true);
        try {
            const blob = await mutationsService.exportLeadsCsv(
                selectedFormId,
                pageId,
                String(selectedAccountId),
                startDate,
                endDate
            );
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `leads_${selectedFormId}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to export leads:', err);
        } finally {
            setIsExporting(false);
        }
    };

    // Handle stage update for a lead
    const handleStageUpdate = async (leadId: string, stageIndex: number) => {
        if (!selectedAccountId || !selectedFormId) return;

        try {
            await mutationsService.updateLeadStage(
                leadId,
                String(selectedAccountId),
                selectedFormId,
                stageIndex
            );
            setLeadStages(prev => ({ ...prev, [leadId]: stageIndex }));
        } catch (err) {
            console.error('Failed to update lead stage:', err);
        }
    };

    // Handle stage name update
    const handleStageNameUpdate = async (index: number, newName: string) => {
        if (!selectedAccountId) return;

        const newStages = [...stageNames];
        newStages[index] = newName;

        try {
            await mutationsService.updateFunnelStages(String(selectedAccountId), newStages);
            setStageNames(newStages);
        } catch (err) {
            console.error('Failed to update stage names:', err);
        }
    };

    // Calculate stage counts
    const stageCounts = useMemo(() => {
        const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
        leads.forEach(lead => {
            const stage = leadStages[lead.id] ?? 0;
            counts[stage] = (counts[stage] || 0) + 1;
        });
        return counts;
    }, [leads, leadStages]);

    return (
        <MainLayout
            title={
                <div className="flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    <span>{t('leads.title') || 'Leads'}</span>
                    <div className="relative group">
                        <Info className="w-4 h-4 text-text-muted cursor-help" />
                        <div className="absolute left-0 top-6 w-64 p-2 bg-card border border-border-subtle rounded-lg shadow-lg text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            {t('leads.gdpr_tooltip') || 'You are the data controller for this lead data under GDPR.'}
                        </div>
                    </div>
                </div>
            }
            description={t('leads.description') || 'View and manage your lead form submissions'}
            compact
        >
            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
                {/* Lead Form Selector */}
                <div className="flex-1 min-w-[200px]">
                    <select
                        value={selectedFormId}
                        onChange={(e) => setSelectedFormId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-card border border-border-subtle rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        <option value="">{t('leads.select_form') || 'Select a lead form...'}</option>
                        {leadForms.map(form => (
                            <option key={form.id} value={form.id}>{form.name}</option>
                        ))}
                    </select>
                </div>

                {/* Date Range Display */}
                <div className="text-sm text-text-muted">
                    {startDate} - {endDate}
                </div>

                {/* Export Button */}
                <button
                    onClick={handleExport}
                    disabled={!selectedFormId || isExporting || leads.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-accent-text rounded-xl transition-all"
                >
                    <Download className="w-4 h-4" />
                    {isExporting ? (t('common.exporting') || 'Exporting...') : (t('leads.export_csv') || 'Export CSV')}
                </button>
            </div>

            {/* Funnel Stages */}
            {stageNames.length > 0 && (
                <div className="mb-6">
                    <FunnelStages
                        stages={stageNames}
                        counts={stageCounts}
                        onStageNameUpdate={handleStageNameUpdate}
                    />
                </div>
            )}

            {/* Leads Table */}
            <LeadsTable
                leads={leads}
                leadStages={leadStages}
                stageNames={stageNames}
                isLoading={isLoading}
                onStageUpdate={handleStageUpdate}
            />
        </MainLayout>
    );
}
