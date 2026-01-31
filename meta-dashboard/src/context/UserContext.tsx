"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/services/apiClient';

interface UserData {
    id: number;
    email: string;
    full_name?: string;
    facebook_id?: string | null;
    is_admin: boolean;
}

interface UserContextType {
    user: UserData | null;
    isLoading: boolean;
    isAdmin: boolean;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadUser = async () => {
        // Skip on public pages
        if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            // Check if it's a public page (no auth required)
            const publicPaths = ['/login', '/callback', '/auth/verify', '/onboard',
                                 '/select-accounts', '/connect', '/privacy-policy', '/terms',
                                 '/pricing'];
            const isPublicPage = publicPaths.some(p => path.includes(p)) ||
                                 path.match(/^\/[a-z]{2}\/?$/);
            if (isPublicPage) {
                setIsLoading(false);
                return;
            }
        }

        try {
            const response = await apiClient.get('/api/v1/users/me');
            setUser(response.data);
        } catch (error) {
            console.error('Failed to load user:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    const refreshUser = async () => {
        setIsLoading(true);
        await loadUser();
    };

    return (
        <UserContext.Provider value={{
            user,
            isLoading,
            isAdmin: user?.is_admin ?? false,
            refreshUser
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
