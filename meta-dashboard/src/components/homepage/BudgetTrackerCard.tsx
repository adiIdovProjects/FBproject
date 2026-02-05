"use client";

/**
 * Budget Tracker Card
 * Shows monthly budget goal vs actual spend
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Pencil, Check, X, Target } from 'lucide-react';
import { fetchOverviewMetrics } from '@/services/dashboard.service';
import { mutationsService, BudgetInfo } from '@/services/mutations.service';
import { fetchCampaignsWithComparison } from '@/services/campaigns.service';
import { useAccount } from '@/context/AccountContext';
import { CampaignRow } from '@/types/campaigns.types';

interface BudgetTrackerCardProps {
  className?: string;
}

export default function BudgetTrackerCard({ className = '' }: BudgetTrackerCardProps) {
  const t = useTranslations();
  const { selectedAccountId } = useAccount();

  // Custom goal from localStorage
  const [customGoal, setCustomGoal] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Load custom goal from localStorage
  useEffect(() => {
    if (selectedAccountId) {
      const saved = localStorage.getItem(`budget-goal-${selectedAccountId}`);
      if (saved) {
        setCustomGoal(parseFloat(saved));
      }
    }
  }, [selectedAccountId]);

  // Get current month date range
  const { startDate, endDate, daysInMonth, daysPassed } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const days = end.getDate();
    const passed = now.getDate();

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0], // Today
      daysInMonth: days,
      daysPassed: passed
    };
  }, []);

  // Fetch current month spend
  const { data: overviewData, isLoading: isSpendLoading } = useQuery({
    queryKey: ['budget-tracker-spend', startDate, endDate, selectedAccountId],
    queryFn: () => fetchOverviewMetrics(`${startDate}:${endDate}`, undefined, selectedAccountId),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch campaigns to get budget info
  const { data: campaigns } = useQuery({
    queryKey: ['budget-tracker-campaigns', selectedAccountId],
    queryFn: () => fetchCampaignsWithComparison(
      { startDate, endDate },
      [],  // status filter
      '',  // search query
      'spend',
      'desc',
      selectedAccountId
    ),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch campaign budgets
  const [budgets, setBudgets] = useState<Record<string, BudgetInfo>>({});

  useEffect(() => {
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map((c: CampaignRow) => String(c.campaign_id));
      mutationsService.getCampaignBudgets(campaignIds).then(setBudgets).catch(() => {});
    }
  }, [campaigns]);

  // Calculate monthly goal from campaign budgets
  const calculatedGoal = useMemo(() => {
    let totalDaily = 0;
    Object.values(budgets).forEach((budget) => {
      if (budget.daily_budget_cents) {
        totalDaily += budget.daily_budget_cents / 100;
      }
    });
    return totalDaily * daysInMonth;
  }, [budgets, daysInMonth]);

  // Use custom goal if set, otherwise calculated
  const monthlyGoal = customGoal !== null ? customGoal : calculatedGoal;
  const currentSpend = overviewData?.current_period?.spend || 0;
  const percentUsed = monthlyGoal > 0 ? Math.min((currentSpend / monthlyGoal) * 100, 100) : 0;
  const remaining = Math.max(monthlyGoal - currentSpend, 0);

  // Projected spend based on current pace
  const projectedSpend = daysPassed > 0 ? (currentSpend / daysPassed) * daysInMonth : 0;
  const isOnTrack = projectedSpend <= monthlyGoal * 1.1; // Within 10% of goal

  const handleSaveGoal = () => {
    const value = parseFloat(editValue);
    if (!isNaN(value) && value > 0) {
      setCustomGoal(value);
      if (selectedAccountId) {
        localStorage.setItem(`budget-goal-${selectedAccountId}`, value.toString());
      }
    }
    setIsEditing(false);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleClearCustomGoal = () => {
    setCustomGoal(null);
    if (selectedAccountId) {
      localStorage.removeItem(`budget-goal-${selectedAccountId}`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!selectedAccountId) return null;

  return (
    <div className={`bg-card-bg/60 border border-border-subtle rounded-2xl p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Target className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{t('budget_tracker.title') || 'Monthly Budget'}</h3>
            <p className="text-xs text-text-muted">{t('budget_tracker.subtitle') || 'Track your spending goal'}</p>
          </div>
        </div>

        {/* Edit Goal Button */}
        {!isEditing && (
          <button
            onClick={() => {
              setEditValue(monthlyGoal.toString());
              setIsEditing(true);
            }}
            className="p-2 text-text-muted hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
            title={t('budget_tracker.edit_goal') || 'Edit goal'}
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Edit Mode */}
      {isEditing && (
        <div className="mb-4 flex items-center gap-2">
          <div className="flex-1 relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-input border border-border-subtle rounded-lg text-foreground text-sm focus:border-accent outline-none"
              placeholder="Monthly goal..."
              autoFocus
            />
          </div>
          <button
            onClick={handleSaveGoal}
            className="p-2 bg-success/20 text-success hover:bg-success/30 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-2 bg-error/20 text-error hover:bg-error/30 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Budget Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">{t('budget_tracker.goal') || 'Goal'}</p>
          <p className="text-lg font-bold text-foreground">
            {isSpendLoading ? '...' : formatCurrency(monthlyGoal)}
          </p>
          {customGoal !== null && (
            <button
              onClick={handleClearCustomGoal}
              className="text-[10px] text-accent hover:underline"
            >
              {t('budget_tracker.use_calculated') || 'Use auto'}
            </button>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">{t('budget_tracker.spent') || 'Spent'}</p>
          <p className="text-lg font-bold text-foreground">
            {isSpendLoading ? '...' : formatCurrency(currentSpend)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">{t('budget_tracker.remaining') || 'Left'}</p>
          <p className={`text-lg font-bold ${remaining > 0 ? 'text-success' : 'text-error'}`}>
            {isSpendLoading ? '...' : formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentUsed > 90 ? 'bg-error' : percentUsed > 70 ? 'bg-warning' : 'bg-success'
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-text-muted">{percentUsed.toFixed(0)}% {t('budget_tracker.used') || 'used'}</span>
          <span className="text-xs text-text-muted">{daysPassed}/{daysInMonth} {t('budget_tracker.days') || 'days'}</span>
        </div>
      </div>

      {/* Projection */}
      {monthlyGoal > 0 && (
        <div className={`text-xs p-2 rounded-lg ${isOnTrack ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
          {isOnTrack
            ? (t('budget_tracker.on_track') || '✓ On track to stay within budget')
            : (t('budget_tracker.over_budget') || '⚠ Projected to exceed budget by ') + formatCurrency(projectedSpend - monthlyGoal)
          }
        </div>
      )}
    </div>
  );
}
