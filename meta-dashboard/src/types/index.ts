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