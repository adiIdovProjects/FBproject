"use client";

/**
 * Leads Page - View and manage leads from lead forms
 * Shows funnel stages, leads table, and CSV export
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Table, LayoutGrid } from 'lucide-react';
import { MainLayout } from '../../../components/MainLayout';
import { useAccount } from '../../../context/AccountContext';
import { mutationsService } from '../../../services/mutations.service';
import FunnelStages from '../../../components/leads/FunnelStages';
import LeadsTable from '../../../components/leads/LeadsTable';
import LeadsKanban from '../../../components/leads/LeadsKanban';

interface LeadForm {
    id: string;
    name: string;
    status: string;
    created_time?: string;
}

export default function LeadsPage() {
    const t = useTranslations();
    const { selectedAccountId, linkedAccounts } = useAccount();

    // State
    const [leadForms, setLeadForms] = useState<LeadForm[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [leads, setLeads] = useState<Record<string, string>[]>([]);
    const [leadStages, setLeadStages] = useState<Record<string, number>>({});
    const [stageNames, setStageNames] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'board'>('details');

    // Date range state (default: last 30 days)
    const [startDate, setStartDate] = useState(() => {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return start.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

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

    // Calculate stage counts (6 stages: 0-4 + Unqualified at 5)
    const stageCounts = useMemo(() => {
        const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        leads.forEach(lead => {
            const stage = leadStages[lead.id] ?? 0;
            counts[stage] = (counts[stage] || 0) + 1;
        });
        return counts;
    }, [leads, leadStages]);

    return (
        <MainLayout
            title={t('leads.title') || 'Leads'}
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

                {/* Date Range Inputs */}
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 bg-card border border-border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <span className="text-text-muted">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 bg-card border border-border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                {/* Tab Buttons */}
                <div className="flex items-center border border-border-subtle rounded-xl overflow-hidden">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
                            activeTab === 'details'
                                ? 'bg-accent text-accent-text'
                                : 'bg-card text-text-muted hover:text-foreground'
                        }`}
                    >
                        <Table className="w-4 h-4" />
                        {t('leads.tab_details') || 'Details'}
                    </button>
                    <button
                        onClick={() => setActiveTab('board')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
                            activeTab === 'board'
                                ? 'bg-accent text-accent-text'
                                : 'bg-card text-text-muted hover:text-foreground'
                        }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        {t('leads.tab_board') || 'Board'}
                    </button>
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

            {/* Leads Content - Table or Kanban */}
            {activeTab === 'details' ? (
                <LeadsTable
                    leads={leads}
                    leadStages={leadStages}
                    stageNames={stageNames}
                    isLoading={isLoading}
                    onStageUpdate={handleStageUpdate}
                />
            ) : (
                <LeadsKanban
                    leads={leads}
                    leadStages={leadStages}
                    stageNames={stageNames}
                    isLoading={isLoading}
                    onStageUpdate={handleStageUpdate}
                />
            )}
        </MainLayout>
    );
}
