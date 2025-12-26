// src/hooks/useI18n.ts

import { useState, useCallback } from 'react';

// 1. ✅ ייבוא הטיפוס לשימוש פנימי בתוך הקובץ (פותר את שגיאת Scope/ts(2304))
import type { TranslationKeys } from '../types/i18n-keys'; 

// 2. ✅ ייצוא מחדש של הטיפוס לשימוש חיצוני (פותר את שגיאת isolatedModules/ts(1205))
export type { TranslationKeys }; 

// ייבוא קובצי ה-JSON (הטיפוסים הגנריים יוכרחו ל-TranslationMap בהמשך)
import heMessages from '../i18n/he.json'; 
import enMessages from '../i18n/en.json';

// ----------------------------------------------------------------------
// 1. TYPES AND INTERFACES
// ----------------------------------------------------------------------

export type Language = 'he' | 'en'; 

// 🛑 TranslationKeys כעת מוכר כאן
type TranslationMap = Record<TranslationKeys, string>;

// כפיית הייבוא לטיפוס TranslationMap
const MESSAGES: Record<Language, TranslationMap> = {
    // הייבוא הוא גנרי (Record<string, any>), לכן אנו מכריחים אותו לטיפוס הבטוח שלנו.
    he: heMessages as TranslationMap,
    en: enMessages as TranslationMap,
};

// ----------------------------------------------------------------------
// 2. THE HOOK
// ----------------------------------------------------------------------

export const useI18n = (initialLang: Language = 'he') => {
    const [lang, setLang] = useState<Language>(initialLang);
    const isRTL = lang === 'he'; 

    /**
     * פונקציית התרגום
     * @param key - מפתח התרגום (כעת מוגבל ל-TranslationKeys)
     * @returns מחרוזת התרגום המתאימה
     */
    const t = useCallback((key: TranslationKeys): string => {
        const messages = MESSAGES[lang]; 
        
        // בדיקה בסיסית אם המפתח קיים
        if (messages && messages[key]) {
            return messages[key];
        }

        // מחזיר מפתח אם לא נמצאה התאמה
        return `[${key}]`; 
    }, [lang]);

    const toggleLang = useCallback(() => {
        setLang((prevLang) => (prevLang === 'he' ? 'en' : 'he'));
    }, []);

    return { lang, t, isRTL, toggleLang };
};