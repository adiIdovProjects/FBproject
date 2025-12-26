// src/utils/date.ts
import { 
    subDays, 
    startOfWeek, 
    startOfMonth, 
    subMonths, 
    endOfMonth, 
    format 
} from 'date-fns'; 
import { QuickSelectKey } from '../constants/app'; 

interface DateRange {
    start: Date | null;
    end: Date | null;
}

/**
 * ממיר אובייקט Date לפורמט מחרוזת YYYY-MM-DD (ISO 8601).
 */
export const formatDate = (date: Date | null | undefined): string | null => {
    if (!date || isNaN(date.getTime())) return null;
    return format(date, 'yyyy-MM-dd');
};

/**
 * מחשב טווח תאריכים קבוע על בסיס מפתח קבוע מראש.
 */
export const calculateDateRange = (key: QuickSelectKey): DateRange => { 
    const today = new Date();
    today.setHours(0, 0, 0, 0); // יום סיום (חצות)

    // הגדרת תחילת שבוע ליום ראשון (0), שנה את זה ל-1 אם אתה רוצה יום שני
    const dateFnsOptions = { weekStartsOn: 0 as const }; 

    switch (key) {
        case 'yesterday': 
            const yesterday = subDays(today, 1);
            return { start: yesterday, end: yesterday };
        case 'last_7_days': 
            return { start: subDays(today, 6), end: today };
        case 'last_14_days': 
            return { start: subDays(today, 13), end: today };
        case 'last_30_days': 
            return { start: subDays(today, 29), end: today };
        case 'this_month': 
            // החודש הנוכחי: מה-1 לחודש ועד היום
            return { start: startOfMonth(today), end: today };
        case 'last_month':
            // חודש שעבר: מה-1 לחודש שעבר ועד היום האחרון בחודש שעבר
            const startOfPreviousMonth = startOfMonth(subMonths(today, 1));
            const endOfPreviousMonth = endOfMonth(subMonths(today, 1));
            return { start: startOfPreviousMonth, end: endOfPreviousMonth };    
        case 'maximum': return { start: new Date(2020, 0, 1), end: today };
        case 'custom': default: return { start: null, end: null };
    }
}

/**
 * Calculate the previous period of equal length for comparison.
 * If current period is last 7 days, returns the 7 days before that.
 */
export const getPreviousPeriod = (startDate: string, endDate: string): { startDate: string; endDate: string } => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate the duration in days (inclusive)
    const durationMs = end.getTime() - start.getTime();
    const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24)) + 1;

    // Calculate previous period (same duration, immediately before current period)
    const prevEnd = subDays(start, 1);
    const prevStart = subDays(prevEnd, durationDays - 1);

    return {
        startDate: formatDate(prevStart) || '',
        endDate: formatDate(prevEnd) || '',
    };
}