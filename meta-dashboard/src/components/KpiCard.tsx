// src/components/KpiCard.tsx

import React from 'react';

interface KpiCardProps {
    title: string;
    value: number;
    unit?: string;
    className?: string;
    isRTL: boolean; 
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit = '', className = '', isRTL }) => {
    
    // *** שינוי: הגדרת לוקאל מפורש גם עבור LTR (כדי להבטיח פורמט אמריקאי) ***
    // עברית (he-IL) משתמשת בנקודה עשרונית ובפסיק כעוצר אלפים (כמו LTR),
    // אך קביעה מפורשת מבטיחה התנהגות עקבית.
    const locale = isRTL ? 'he-IL' : 'en-US'; 
    
    // פורמט המספר: שני מקומות אחרי הנקודה ועוצרות אלפים
    const formattedValue = value.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    
    // CSS קלאסים להתאמת כיווניות ה-flex
    const flexRTL = isRTL ? 'flex-row-reverse' : 'flex-row';

    return (
        <div 
            className={`p-6 rounded-xl shadow-lg transition-shadow duration-300 hover:shadow-xl ${className} border border-gray-200`} 
            dir={isRTL ? 'rtl' : 'ltr'} // קובע כיווניות לכל הכרטיס
        >
            <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
            
            <div className={`mt-1 flex items-baseline ${flexRTL}`}>
                <p className="text-3xl font-bold text-gray-900">
                    
                    {/* יחידת המידה: קטנה יותר וצבע שונה */}
                    <span className="text-xl font-normal text-gray-600 mr-1">{unit}</span>
                    
                    {/* הערך המעוצב */}
                    {/* dir="ltr" כאן מבטיח שהמספרים עצמם תמיד נקראים משמאל לימין, גם בתוך כרטיס RTL */}
                    <span className={`text-3xl font-bold`} dir="ltr">{formattedValue}</span>
                </p>
            </div>
        </div>
    );
};

export default KpiCard;