'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'colorful';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'adsolus-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    // Load theme from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (stored && ['light', 'dark', 'colorful'].includes(stored)) {
            setThemeState(stored);
        }
        setMounted(true);
    }, []);

    // Apply theme class to <html> element
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;

        // Remove all theme classes
        root.classList.remove('light', 'dark', 'colorful');

        // Add current theme class (dark is default, no class needed)
        if (theme !== 'dark') {
            root.classList.add(theme);
        }

        // Update color-scheme for browser UI
        root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
    }, [theme, mounted]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
    };

    // Prevent flash of wrong theme
    if (!mounted) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
