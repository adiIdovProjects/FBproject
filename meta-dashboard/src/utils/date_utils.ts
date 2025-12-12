/**
 * ממיר אובייקט Date לפורמט מחרוזת YYYY-MM-DD.
 * @param date אובייקט Date, או null/undefined.
 * @returns מחרוזת בפורמט ISO-8601 (YYYY-MM-DD), או null אם הקלט הוא null/undefined.
 */
export const formatDate = (date: Date | null | undefined): string | null => {
    if (!date) return null;
    
    // ודא שהאובייקט הוא אכן Date ואינו "Invalid Date"
    if (isNaN(date.getTime())) {
        console.error("Invalid Date object provided to formatDate.");
        return null;
    }

    // toISOString מחזיר פורמט כמו "2023-10-26T00:00:00.000Z".
    // אנו לוקחים רק את החלק של התאריך.
    return date.toISOString().split('T')[0];
};

// דוגמאות שימוש (ניתן להסיר בקוד הפרודקשן)
/*
const today = new Date();
console.log(formatDate(today)); // לדוגמה: "2025-12-11"

const nullDate = null;
console.log(formatDate(nullDate)); // null

const invalidDate = new Date("invalid string");
console.log(formatDate(invalidDate)); // null (עם הודעת שגיאה בקונסול)
*/