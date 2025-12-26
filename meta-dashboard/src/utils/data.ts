// src/utils/data.ts

/**
 * ממיר ערך ל-Number בצורה בטוחה, מחזיר 0 אם הערך אינו חוקי.
 */
export const safeParseNumber = (value: any): number => {
    if (value === null || typeof value === 'undefined' || value === '') return 0;
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
};

/**
 * מחזיר את כתובת ה-API הבסיסית.
 */
export const getInitialApiBaseUrl = (): string => {
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (envUrl) {
        return envUrl;
    }

    return 'http://localhost:8000'; 
};