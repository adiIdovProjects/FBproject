"use client";

/**
 * StatusConfirmModal - Guided confirmation dialog for Pause/Resume actions
 * Educates users about what the action does and shows impact
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { X, Pause, Play, AlertCircle } from 'lucide-react';

interface StatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  type: 'campaign' | 'adset' | 'ad';
  name: string;
  currentStatus: string;
  dailySpend?: number;
  currency?: string;
}

export default function StatusConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  type,
  name,
  currentStatus,
  dailySpend,
  currency = 'USD',
}: StatusConfirmModalProps) {
  const t = useTranslations();

  if (!isOpen) return null;

  const isPausing = currentStatus === 'ACTIVE';
  const newStatus = isPausing ? 'PAUSED' : 'ACTIVE';

  // Format daily spend
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get type label
  const getTypeLabel = () => {
    switch (type) {
      case 'campaign': return t('status_modal.type_campaign');
      case 'adset': return t('status_modal.type_adset');
      case 'ad': return t('status_modal.type_ad');
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-700 ${isPausing ? 'bg-yellow-900/20' : 'bg-green-900/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPausing ? (
                <div className="p-2 rounded-lg bg-yellow-900/30 border border-yellow-600">
                  <Pause className="w-5 h-5 text-yellow-400" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-green-900/30 border border-green-600">
                  <Play className="w-5 h-5 text-green-400" />
                </div>
              )}
              <h2 className="text-lg font-bold text-white">
                {isPausing ? t('status_modal.title_pause') : t('status_modal.title_resume')} {getTypeLabel()}?
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{getTypeLabel()}</p>
            <p className="text-white font-semibold truncate">{name}</p>
          </div>

          {/* Explanation */}
          <div className="flex items-start gap-3 p-3 bg-blue-900/20 rounded-xl border border-blue-500/20">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300 leading-relaxed">
              {isPausing ? (
                type === 'campaign' ? t('status_modal.pause_campaign_explanation') :
                type === 'adset' ? t('status_modal.pause_adset_explanation') :
                t('status_modal.pause_ad_explanation')
              ) : (
                type === 'campaign' ? t('status_modal.resume_campaign_explanation') :
                type === 'adset' ? t('status_modal.resume_adset_explanation') :
                t('status_modal.resume_ad_explanation')
              )}
            </div>
          </div>

          {/* Daily spend impact (if available and pausing) */}
          {isPausing && dailySpend !== undefined && dailySpend > 0 && (
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-sm text-gray-400">{t('status_modal.daily_spend')}</span>
              <span className="text-white font-semibold">~{formatCurrency(dailySpend)}/day</span>
            </div>
          )}

          {/* Reassurance */}
          <p className="text-xs text-gray-500 text-center">
            {t('status_modal.reassurance')}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              isPausing
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isPausing ? (
              <>
                <Pause className="w-4 h-4" />
                {t('status_modal.confirm_pause')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {t('status_modal.confirm_resume')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
