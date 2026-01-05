"use client";

/**
 * ExportButton Component
 * Dropdown button for exporting to Google Sheets or Excel
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { DateRange } from '../../types/campaigns.types';
import { exportToSheets, exportToExcel } from '../../services/campaigns.service';

interface ExportButtonProps {
  dateRange: DateRange;
  onExportSuccess?: (message: string) => void;
  onExportError?: (error: string) => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  dateRange,
  onExportSuccess,
  onExportError,
}) => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleExportToSheets = async () => {
    setIsLoading(true);
    setIsOpen(false);

    try {
      const result = await exportToSheets(dateRange);
      window.open(result.url, '_blank');
      onExportSuccess?.('Successfully exported to Google Sheets!');
    } catch (error: any) {
      console.error('Export to Sheets error:', error);
      onExportError?.(error.message || 'Failed to export to Google Sheets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    setIsLoading(true);
    setIsOpen(false);

    try {
      const blob = await exportToExcel(dateRange);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaigns_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      onExportSuccess?.('Successfully downloaded Excel file!');
    } catch (error: any) {
      console.error('Export to Excel error:', error);
      onExportError?.(error.message || 'Failed to export to Excel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>{isLoading ? t('actions.exporting') : t('actions.export')}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isLoading && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
          <div className="py-1">
            {/* Google Sheets Option */}
            <button
              onClick={handleExportToSheets}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition-colors duration-150"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
              <span>{t('reports.export_to_google_sheets')}</span>
            </button>

            {/* Excel Option */}
            <button
              onClick={handleExportToExcel}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition-colors duration-150"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>{t('reports.export_to_excel')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ExportButton;
