"use client";

/**
 * DownloadLeadsSection Component
 * Allows users to download leads from their lead forms as CSV
 * Filters leads by the selected date range
 */

import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { mutationsService } from '../../services/mutations.service';

interface LeadForm {
    id: string;
    name: string;
    created_time?: string;
}

interface DownloadLeadsSectionProps {
    pageId: string | null;
    accountId: string | null;
    startDate: string;
    endDate: string;
    t: (key: string) => string;
}

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

export const DownloadLeadsSection: React.FC<DownloadLeadsSectionProps> = ({
    pageId,
    accountId,
    startDate,
    endDate,
    t
}) => {
    const [leadForms, setLeadForms] = useState<LeadForm[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [leadCount, setLeadCount] = useState<number | null>(null);

    // Always include today for leads (Facebook provides real-time lead data)
    const leadsEndDate = getTodayDate();

    // Fetch lead forms when pageId changes
    useEffect(() => {
        const fetchForms = async () => {
            if (!pageId) {
                setLeadForms([]);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const forms = await mutationsService.getLeadForms(pageId, accountId || undefined);
                setLeadForms(forms);
                if (forms.length > 0) {
                    setSelectedFormId(forms[0].id);
                }
            } catch (err: any) {
                console.error('Failed to fetch lead forms:', err);
                // Don't show error if no lead forms - just hide the section
                setLeadForms([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchForms();
    }, [pageId, accountId]);

    // Fetch lead count when form or date range changes
    useEffect(() => {
        const fetchCount = async () => {
            if (!selectedFormId || !pageId) {
                setLeadCount(null);
                return;
            }

            console.log('[DownloadLeads] Fetching leads with:', {
                formId: selectedFormId,
                pageId,
                accountId,
                startDate,
                endDate: leadsEndDate
            });

            try {
                const response = await mutationsService.getLeads(
                    selectedFormId,
                    pageId,
                    accountId || undefined,
                    startDate,
                    leadsEndDate  // Always include today
                );
                console.log('[DownloadLeads] Got', response.total, 'leads');
                setLeadCount(response.total);
            } catch (err) {
                console.error('[DownloadLeads] Error fetching leads:', err);
                setLeadCount(null);
            }
        };

        fetchCount();
    }, [selectedFormId, pageId, accountId, startDate, leadsEndDate]);

    // Handle CSV download
    const handleDownload = async () => {
        if (!selectedFormId || !pageId) return;

        setIsDownloading(true);
        setError(null);

        try {
            const blob = await mutationsService.exportLeadsCsv(
                selectedFormId,
                pageId,
                accountId || undefined,
                startDate,
                leadsEndDate  // Always include today
            );

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `leads_${selectedFormId}_${startDate}_to_${leadsEndDate}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Failed to download leads:', err);
            setError(err.response?.data?.detail || 'Failed to download leads');
        } finally {
            setIsDownloading(false);
        }
    };

    // Don't render if no page or no lead forms
    if (!pageId || (leadForms.length === 0 && !isLoading)) {
        return null;
    }

    return (
        <div className="bg-card-bg border border-border-subtle rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
                <FileSpreadsheet className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold text-gray-100">
                    {t('campaigns.download_leads') || 'Download Leads'}
                </h3>
            </div>

            {isLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('common.loading') || 'Loading...'}</span>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-4">
                    {/* Form Selector */}
                    <div className="flex-1 min-w-[200px]">
                        <select
                            value={selectedFormId}
                            onChange={(e) => setSelectedFormId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                            {leadForms.map((form) => (
                                <option key={form.id} value={form.id}>
                                    {form.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Lead Count & Date Info */}
                    {leadCount !== null && (
                        <div className="text-sm text-gray-400">
                            {leadCount} {t('campaigns.leads') || 'leads'}
                            <span className="text-gray-500 ml-2">
                                ({startDate} → {t('common.today') || 'today'})
                            </span>
                        </div>
                    )}

                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading || !selectedFormId || leadCount === 0}
                        className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        {isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        <span>{t('campaigns.download_csv') || 'Download CSV'}</span>
                    </button>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

export default DownloadLeadsSection;
