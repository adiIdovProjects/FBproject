"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AdAccount, fetchLinkedAccounts, accountsService } from '@/services/accounts.service';

interface AccountContextType {
    selectedAccountId: string | null;
    setSelectedAccountId: (id: string | null) => void;
    linkedAccounts: AdAccount[];
    isLoading: boolean;
    refreshAccounts: () => Promise<void>;
    hasROAS: boolean | null; // null = loading, true = account has purchase value, false = no purchase value
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(null);
    const [linkedAccounts, setLinkedAccounts] = useState<AdAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasROAS, setHasROAS] = useState<boolean | null>(null);

    // Initial load
    useEffect(() => {
        loadAccounts();
    }, []);

    // Load selected account from local storage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('selectedAccountId');
            if (saved) {
                // Verify if saved account still exists in linkedAccounts once loaded
                // But initially just set it to avoid flicker
                setSelectedAccountIdState(saved);
            }
        }
    }, []);

    // Fetch hasROAS when selectedAccountId changes
    useEffect(() => {
        const fetchHasROAS = async () => {
            // Skip if no token (not authenticated)
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('token');
                if (!token) {
                    setHasROAS(null);
                    return;
                }
            }

            if (!selectedAccountId) {
                setHasROAS(null);
                return;
            }
            try {
                const response = await accountsService.getConversionTypes(selectedAccountId);
                setHasROAS(response.data.has_purchase_value);
            } catch (error: any) {
                console.error('Failed to fetch account ROAS status:', error);

                // If 403 Forbidden, it means the user no longer has access to this account
                // (stale localStorage data). We should clear it.
                if (error.response && error.response.status === 403) {
                    console.warn(`Access denied to account ${selectedAccountId}. Clearing selection.`);
                    setSelectedAccountId(null);
                }

                setHasROAS(false); // Default to false on error
            }
        };
        fetchHasROAS();
    }, [selectedAccountId]);

    const loadAccounts = async () => {
        try {
            setIsLoading(true);

            // Skip loading if no auth token exists (e.g., on login page)
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('token');
                if (!token) {
                    setIsLoading(false);
                    return;
                }
            }

            const accounts = await fetchLinkedAccounts();
            setLinkedAccounts(accounts);

            // If no account selected or selected account not in list (and we have accounts), select first
            const saved = typeof window !== 'undefined' ? localStorage.getItem('selectedAccountId') : null;

            if (accounts.length > 0) {
                if (!saved || !accounts.find(a => a.account_id === saved)) {
                    // Default to first account or null if we want to force selection? 
                    // Let's default to null (All Accounts) or first?
                    // User request implies "data mixing" when no filter. 
                    // So maybe default to the first one to be safe, or null means "All Connected".
                    // The issue was "data from previously pulled account is shown".
                    // Let's default to the first account to ensure isolation, unless user explicitly validates "All".
                    // Actually, let's keep it null if we want "All", but to solve data mixing for a specific view,
                    // we usually want a specific account.
                    // Let's set to the first one if nothing selected.
                    const firstId = accounts[0].account_id;
                    setSelectedAccountId(firstId);
                } else {
                    setSelectedAccountId(saved);
                }
            }
        } catch (error) {
            console.error('Failed to load linked accounts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setSelectedAccountId = (id: string | null) => {
        setSelectedAccountIdState(id);
        if (typeof window !== 'undefined') {
            if (id) {
                localStorage.setItem('selectedAccountId', id);
            } else {
                localStorage.removeItem('selectedAccountId');
            }
        }
    };

    const refreshAccounts = async () => {
        await loadAccounts();
    };

    return (
        <AccountContext.Provider value={{
            selectedAccountId,
            setSelectedAccountId,
            linkedAccounts,
            isLoading,
            refreshAccounts,
            hasROAS
        }}>
            {children}
        </AccountContext.Provider>
    );
};

export const useAccount = () => {
    const context = useContext(AccountContext);
    if (context === undefined) {
        throw new Error('useAccount must be used within an AccountProvider');
    }
    return context;
};
