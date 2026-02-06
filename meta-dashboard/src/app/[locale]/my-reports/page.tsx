"use client";

/**
 * My Reports Page - Simple Report Builder for Beginners
 * Users can select metrics, add a chart, toggle recommendations,
 * and schedule email delivery.
 */

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  HelpCircle,
  Check,
  Mail,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Loader2,
  DollarSign,
  Target,
  MousePointer,
  Eye,
  Percent,
  TrendingUp,
  PiggyBank,
} from 'lucide-react';

import { MainLayout } from '../../../components/MainLayout';
import { useAccount } from '../../../context/AccountContext';
import { useToast } from '../../../context/ToastContext';
import {
  fetchMyReport,
  saveMyReportPreferences,
  MyReportPreferences,
  Recommendation,
} from '../../../services/reports.service';

// Available metrics with icons
const AVAILABLE_METRICS = [
  { id: 'spend', label: 'Spend', icon: DollarSign },
  { id: 'conversions', label: 'Conversions', icon: Target },
  { id: 'cpa', label: 'Cost per Result', icon: PiggyBank },
  { id: 'clicks', label: 'Clicks', icon: MousePointer },
  { id: 'impressions', label: 'Impressions', icon: Eye },
  { id: 'ctr', label: 'CTR', icon: Percent },
  { id: 'roas', label: 'ROAS', icon: TrendingUp },
];

// Chart options
const CHART_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'spend', label: 'Spend (7 days)' },
  { id: 'conversions', label: 'Conversions (7 days)' },
];

// Email schedule options
const SCHEDULE_OPTIONS = [
  { id: 'none', label: "Don't send emails" },
  { id: 'daily', label: 'Send Daily (8:00 AM)' },
  { id: 'weekly', label: 'Send Weekly (Monday 8:00 AM)' },
];

export default function MyReportsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { selectedAccountId } = useAccount();
  const isRTL = locale === 'ar' || locale === 'he';

  // Form state
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['spend', 'conversions', 'cpa']);
  const [chartType, setChartType] = useState('spend');
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [emailSchedule, setEmailSchedule] = useState('none');

  // Fetch current preferences and preview
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-report', selectedAccountId],
    queryFn: () => fetchMyReport(selectedAccountId?.toString()),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  });

  // Update form when data loads
  useEffect(() => {
    if (data?.preferences) {
      setSelectedMetrics(data.preferences.selected_metrics);
      setChartType(data.preferences.chart_type);
      setIncludeRecommendations(data.preferences.include_recommendations);
      setEmailSchedule(data.preferences.email_schedule);
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (prefs: MyReportPreferences) =>
      saveMyReportPreferences(prefs, selectedAccountId?.toString()),
    onSuccess: () => {
      showToast(t('my_report.saved_success') || 'Report settings saved!', 'success');
      queryClient.invalidateQueries({ queryKey: ['my-report'] });
    },
    onError: () => {
      showToast(t('my_report.saved_error') || 'Failed to save settings', 'error');
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      selected_metrics: selectedMetrics,
      chart_type: chartType,
      include_recommendations: includeRecommendations,
      email_schedule: emailSchedule,
    });
  };

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((m) => m !== metricId) : [...prev, metricId]
    );
  };

  const formatMetricValue = (key: string, value: number): string => {
    if (value === undefined || value === null) return '-';
    if (key === 'spend' || key === 'cpa') return `$${value.toFixed(2)}`;
    if (key === 'ctr') return `${value.toFixed(2)}%`;
    if (key === 'roas') return value.toFixed(2);
    if (key === 'conversions' || key === 'clicks' || key === 'impressions') {
      return value.toLocaleString();
    }
    return String(value);
  };

  return (
    <MainLayout
      title={t('my_report.title') || 'My Report'}
      description={t('my_report.subtitle') || 'Build your daily snapshot'}
    >
      <div className="max-w-4xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Page Help */}
        <div className="flex items-center gap-2 text-gray-400">
          <HelpCircle className="w-4 h-4" />
          <span className="text-sm">
            {t('my_report.help_text') ||
              'Select the metrics you care about, add a chart, and schedule email delivery.'}
          </span>
        </div>

        {/* Metrics Selection */}
        <div className="bg-card-bg/40 border border-border-subtle rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            {t('my_report.choose_metrics') || 'Choose Your Metrics'}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {t('my_report.metrics_description') || 'Select what matters to you'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {AVAILABLE_METRICS.map((metric) => {
              const Icon = metric.icon;
              const isSelected = selectedMetrics.includes(metric.id);
              return (
                <button
                  key={metric.id}
                  onClick={() => toggleMetric(metric.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 border-blue-500 text-white'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{metric.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Selection */}
        <div className="bg-card-bg/40 border border-border-subtle rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            {t('my_report.add_chart') || 'Add a Chart'} <span className="text-gray-500 font-normal text-sm">(optional)</span>
          </h3>
          <div className="flex flex-wrap gap-3">
            {CHART_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setChartType(option.id)}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  chartType === option.id
                    ? 'bg-purple-500/20 border-purple-500 text-white'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {chartType === option.id && <Check className="w-4 h-4 inline mr-2 text-purple-400" />}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recommendations Toggle */}
        <div className="bg-card-bg/40 border border-border-subtle rounded-2xl p-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIncludeRecommendations(!includeRecommendations)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                includeRecommendations ? 'bg-yellow-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  includeRecommendations ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-medium">
                {t('my_report.include_recommendations') || 'Show me 1-2 simple tips based on my data'}
              </span>
            </div>
          </label>
        </div>

        {/* Email Schedule */}
        <div className="bg-card-bg/40 border border-border-subtle rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-green-400" />
            {t('my_report.schedule_email') || 'Schedule Email'}
          </h3>
          <div className="space-y-2">
            {SCHEDULE_OPTIONS.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-800/50 transition-colors"
              >
                <input
                  type="radio"
                  name="schedule"
                  checked={emailSchedule === option.id}
                  onChange={() => setEmailSchedule(option.id)}
                  className="w-4 h-4 text-green-500 bg-gray-700 border-gray-600"
                />
                <span className="text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium rounded-xl transition-all shadow-lg disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                {t('my_report.save_settings') || 'Save Report Settings'}
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        <div className="bg-card-bg/40 border border-border-subtle rounded-2xl overflow-hidden">
          <div className="p-4 bg-gray-800/50 border-b border-border-subtle">
            <h3 className="text-lg font-semibold text-white">
              {t('my_report.preview') || 'Preview'}
            </h3>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-gray-400">
                {t('common.error_loading') || 'Failed to load preview'}
              </div>
            ) : data?.preview ? (
              <div className="space-y-6">
                {/* Date */}
                <p className="text-sm text-gray-400">
                  Yesterday: {data.preview.date}
                </p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedMetrics.map((metricId) => {
                    const metric = AVAILABLE_METRICS.find((m) => m.id === metricId);
                    const Icon = metric?.icon || FileText;
                    const value = data.preview.metrics[metricId];
                    return (
                      <div key={metricId} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                        <Icon className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-xs text-gray-400">{metric?.label}</p>
                          <p className="text-lg font-semibold text-white">
                            {formatMetricValue(metricId, value)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Budget Status */}
                {data.preview.budget_status && (
                  <div className="p-4 bg-gray-800/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Budget Progress</span>
                      <span className="text-sm text-gray-300">
                        {data.preview.budget_status.percent_of_month.toFixed(0)}% of month
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        style={{ width: `${Math.min(data.preview.budget_status.percent_of_month, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      ${data.preview.budget_status.month_to_date_spend.toFixed(2)} spent this month
                    </p>
                  </div>
                )}

                {/* Recommendations */}
                {includeRecommendations && data.preview.recommendations?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Recommendations
                    </h4>
                    {data.preview.recommendations.map((rec: Recommendation, idx: number) => (
                      <p key={idx} className="text-sm text-gray-300 pl-6">
                        • {rec.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                {t('my_report.no_data') || 'No data available'}
              </div>
            )}
          </div>
        </div>

        {/* Advanced Reports Link */}
        <div className="text-center">
          <button
            onClick={() => router.push(`/${locale}/reports`)}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors"
          >
            {t('my_report.advanced_link') || 'Want deeper analysis?'}
            <ArrowRight className="w-4 h-4" />
            {t('my_report.view_advanced') || 'View Advanced Reports'}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
