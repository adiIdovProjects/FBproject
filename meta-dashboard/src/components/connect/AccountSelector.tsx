"use client";

import React, { useState } from 'react';
import { AdAccount } from '@/services/accounts.service';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface AccountSelectorProps {
    accounts: AdAccount[];
    onLink: (selectedAccounts: AdAccount[]) => Promise<void>;
    isLoading?: boolean;
}

export function AccountSelector({ accounts, onLink, isLoading = false }: AccountSelectorProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLinking, setIsLinking] = useState(false);

    const toggleAccount = (accountId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(accountId)) {
            newSelected.delete(accountId);
        } else {
            newSelected.add(accountId);
        }
        setSelectedIds(newSelected);
    };

    const selectAll = () => {
        setSelectedIds(new Set(accounts.map(acc => acc.account_id)));
    };

    const deselectAll = () => {
        setSelectedIds(new Set());
    };

    const handleLink = async () => {
        const selected = accounts.filter(acc => selectedIds.has(acc.account_id));
        if (selected.length === 0) return;

        setIsLinking(true);
        try {
            await onLink(selected);
        } finally {
            setIsLinking(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                <p className="text-gray-400">Loading your Facebook ad accounts...</p>
            </div>
        );
    }

    if (accounts.length === 0) {
        return (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8 text-center">
                <div className="mb-4 text-red-400 text-5xl">⚠️</div>
                <h3 className="text-xl font-bold text-white mb-2">No Ad Accounts Found</h3>
                <p className="text-gray-400 mb-6">
                    We couldn't find any Facebook ad accounts associated with your account.
                    <br />
                    Please ensure you have admin access to at least one ad account.
                </p>
                <button
                    onClick={() => window.location.href = '/en/connect'}
                    className="px-6 py-3 bg-accent hover:bg-accent/80 text-white rounded-lg font-medium transition-colors"
                >
                    Try Reconnecting
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with select all/none buttons */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Select Ad Accounts</h2>
                    <p className="text-gray-400 mt-1">
                        Choose which accounts you want to track ({accounts.length} available)
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={selectAll}
                        className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        Select All
                    </button>
                    <button
                        onClick={deselectAll}
                        className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        Deselect All
                    </button>
                </div>
            </div>

            {/* Account list */}
            <div className="space-y-3">
                {accounts.map((account) => {
                    const isSelected = selectedIds.has(account.account_id);

                    return (
                        <button
                            key={account.account_id}
                            onClick={() => toggleAccount(account.account_id)}
                            className={`
                                w-full p-5 rounded-xl border-2 transition-all duration-200 text-left
                                ${isSelected
                                    ? 'bg-accent/10 border-accent shadow-lg shadow-accent/20'
                                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                }
                            `}
                        >
                            <div className="flex items-center gap-4">
                                {/* Checkbox icon */}
                                <div className="flex-shrink-0">
                                    {isSelected ? (
                                        <CheckCircle className="w-6 h-6 text-accent" />
                                    ) : (
                                        <Circle className="w-6 h-6 text-gray-500" />
                                    )}
                                </div>

                                {/* Account info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-white truncate">
                                        {account.name}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-1">
                                        <span className="text-sm text-gray-400">
                                            ID: {account.account_id}
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            Currency: {account.currency}
                                        </span>
                                        {account.page_id && (
                                            <span className="text-sm text-green-400/80 bg-green-900/20 px-2 py-0.5 rounded border border-green-700/30">
                                                Page Connected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Link button */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-700">
                <p className="text-gray-400">
                    {selectedIds.size} account{selectedIds.size !== 1 ? 's' : ''} selected
                </p>
                <button
                    onClick={handleLink}
                    disabled={selectedIds.size === 0 || isLinking}
                    className={`
                        px-8 py-3 rounded-lg font-semibold transition-all duration-200
                        flex items-center gap-2
                        ${selectedIds.size === 0 || isLinking
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/30'
                        }
                    `}
                >
                    {isLinking && <Loader2 className="w-5 h-5 animate-spin" />}
                    {isLinking ? 'Linking Accounts...' : `Link ${selectedIds.size} Account${selectedIds.size !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    );
}
