// src/constants/app.ts

// שימו לב: אנו מייבאים את TranslationKeys רק כדי להבטיח Type safety
import { TranslationKeys } from '../hooks/useI18n';

// --- TYPES (מגדירים מחדש את הטיפוסים הנדרשים) ---
export type Granularity = 'day' | 'week' | 'month';

// ----------------------------------------------------------------------
// 1. CONSTANTS (קבועים של האפליקציה)
// ----------------------------------------------------------------------

export const METRIC_OPTIONS = [
    { key: 'total_spend' as const, labelKey: 'total_spend' as TranslationKeys, color: '#6366f1', format: (v: number) => `$${v.toFixed(0)}` },
    { key: 'total_clicks' as const, labelKey: 'total_clicks' as TranslationKeys, color: '#f59e0b', format: (v: number) => v.toLocaleString() },
    { key: 'total_conversions' as const, labelKey: 'total_conversions' as TranslationKeys, color: '#14b8a6', format: (v: number) => v.toLocaleString() },
    { key: 'total_impressions' as const, labelKey: 'total_impressions' as TranslationKeys, color: '#10b981', format: (v: number) => v.toLocaleString() },
    { key: 'total_ctr' as const, labelKey: 'total_ctr' as TranslationKeys, color: '#f97316', format: (v: number) => `${(v * 100).toFixed(2)}%` },
    { key: 'total_cpc' as const, labelKey: 'total_cpc' as TranslationKeys, color: '#ef4444', format: (v: number) => `$${v.toFixed(2)}` },
    { key: 'total_cpa' as const, labelKey: 'total_cpa' as TranslationKeys, color: '#3b82f6', format: (v: number) => `$${v.toFixed(2)}` },
] as const;
// ייצוא מפתח המטריקות כ Union Type
export type MetricKey = typeof METRIC_OPTIONS[number]['key'];


export const GRANULARITY_OPTIONS = [
    { key: 'day' as const, labelKey: 'daily' as TranslationKeys },
    { key: 'week' as const, labelKey: 'weekly' as TranslationKeys },
    { key: 'month' as const, labelKey: 'monthly' as TranslationKeys },
] as const;

export type GranularityKey = typeof GRANULARITY_OPTIONS[number]['key'];

export const QUICK_SELECT_OPTIONS = [
    { key: 'yesterday' as const, labelKey: 'yesterday' as TranslationKeys },
    { key: 'last_7_days' as const, labelKey: 'last_7_days' as TranslationKeys },
    { key: 'last_14_days' as const, labelKey: 'last_14_days' as TranslationKeys },
    { key: 'last_30_days' as const, labelKey: 'last_30_days' as TranslationKeys },
    { key: 'last_60_days' as const, labelKey: 'last_60_days' as TranslationKeys },
    { key: 'last_90_days' as const, labelKey: 'last_90_days' as TranslationKeys },
    { key: 'this_month' as const, labelKey: 'this_month' as TranslationKeys },
    { key: 'last_month' as const, labelKey: 'last_month' as TranslationKeys },
    { key: 'maximum' as const, labelKey: 'maximum' as TranslationKeys },
    { key: 'custom' as const, labelKey: 'custom' as TranslationKeys },
] as const;
export type QuickSelectKey = typeof QUICK_SELECT_OPTIONS[number]['key'];

export const DEFAULT_DATE_RANGE_KEY: QuickSelectKey = 'last_30_days';

// ----------------------------------------------------------------------
// 4. FILTER DEFINITIONS (מבנה קבוצתי חדש)
// ----------------------------------------------------------------------

export type FilterType = 'text' | 'select' | 'status';

export interface FilterOption {
    key: string;
    labelKey: TranslationKeys; // מפתח תרגום של שם הפילטר
    type: FilterType;
    options?: { value: string; labelKey: TranslationKeys }[];
}

// מבנה חדש: קבוצת פילטרים
export interface FilterGroup {
    groupKey: TranslationKeys; // מפתח תרגום של כותרת הקבוצה
    filters: FilterOption[];
}

// רשימת קבוצות הפילטרים הניתנות לבחירה
export const FILTER_GROUPS: FilterGroup[] = [
    {
        groupKey: 'campaigns.filter_group_name',
        filters: [
            {
                key: 'campaign_name',
                labelKey: 'campaigns.campaign_name',
                type: 'text',
            },
            {
                key: 'ad_set_name',
                labelKey: 'breakdown.ad_set_name',
                type: 'text',
            },
            {
                key: 'ad_name',
                labelKey: 'breakdown.ad_name',
                type: 'text',
            },
        ]
    },
    {
        groupKey: 'campaigns.filter_group_status',
        filters: [
            {
                key: 'campaign_status',
                labelKey: 'campaigns.campaign_status',
                type: 'status',
                options: [
                    { value: 'active', labelKey: 'common.status' }, // Fallback or specific status keys needed
                    { value: 'paused', labelKey: 'common.status' },
                    { value: 'archived', labelKey: 'common.status' },
                ],
            },
            {
                key: 'ad_set_status',
                labelKey: 'breakdown.ad_set_name', // Using generic for now
                type: 'status',
                options: [
                    { value: 'active', labelKey: 'common.status' },
                    { value: 'paused', labelKey: 'common.status' },
                ],
            },
        ]
    },
    {
        groupKey: 'campaigns.filter_group_delivery',
        filters: [
            {
                key: 'delivery_status',
                labelKey: 'reports.filters_panel', // Placeholder
                type: 'select',
                options: [
                    { value: 'delivery_on', labelKey: 'common.status' },
                    { value: 'delivery_off', labelKey: 'common.status' },
                ],
            },
        ]
    }
];

// רשימה שטוחה לשימוש פנימי מהיר
export const ALL_FILTER_OPTIONS: FilterOption[] = FILTER_GROUPS.flatMap(group => group.filters);