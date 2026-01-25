'use client';

import { useTheme, Theme } from '@/context/ThemeContext';
import { useTranslations } from 'next-intl';

const themes: { value: Theme; icon: string }[] = [
    { value: 'light', icon: 'light_mode' },
    { value: 'dark', icon: 'dark_mode' },
    { value: 'colorful', icon: 'palette' },
];

export default function ThemeSelector() {
    const { theme, setTheme } = useTheme();
    const t = useTranslations('theme');

    return (
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
            {themes.map(({ value, icon }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`
                        flex items-center justify-center w-8 h-8 rounded-md transition-all
                        ${theme === value
                            ? 'bg-accent text-accent-text shadow-sm'
                            : 'text-text-muted hover:text-foreground hover:bg-secondary'
                        }
                    `}
                    title={t(value)}
                    aria-label={t(value)}
                >
                    <span className="material-symbols-outlined text-lg">
                        {icon}
                    </span>
                </button>
            ))}
        </div>
    );
}
