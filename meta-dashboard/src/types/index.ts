export interface KpiSummary {
  total_spend: number;
  total_purchases: number;
  cpa: number;
}

export interface DailyKpi {
  date: string; // נקבל את זה כסטרינג בפורמט ISO
  spend: number;
  purchases: number;
}