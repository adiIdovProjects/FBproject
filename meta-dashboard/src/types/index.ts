// src/types.ts

// פורמט הנתונים החוזרים מה-API עבור דוחות יומיים או מפורטים (core_summary)
export interface DailyKpi {
  date: string; // פורמט ISO (YYYY-MM-DD)
  spend: number;
  purchases: number;
  // וכל שדה נוסף שאתה מחזיר (כמו clicks, impressions)
}

// פורמט הנתונים המסוכמים (מחושב ב-Frontend)
export interface KpiSummary {
  total_spend: number;
  total_purchases: number;
  cpa: number;
}

// ✅ NEW: פורמט הנתונים החוזרים עבור דוח פירוט קריאייטיב
export interface CreativeMetric {
    creative_name: string;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_purchases: number;
    CTR: number;
    CPC: number;
    CPA: number;
}