"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AIChatContextType {
    isOpen: boolean;
    initialQuery: string | undefined;
    openChat: (query?: string) => void;
    closeChat: () => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export const AIChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);

    const openChat = (query?: string) => {
        setInitialQuery(query);
        setIsOpen(true);
    };

    const closeChat = () => {
        setIsOpen(false);
        setInitialQuery(undefined);
    };

    return (
        <AIChatContext.Provider value={{ isOpen, initialQuery, openChat, closeChat }}>
            {children}
        </AIChatContext.Provider>
    );
};

export const useAIChat = () => {
    const context = useContext(AIChatContext);
    if (context === undefined) {
        throw new Error('useAIChat must be used within an AIChatProvider');
    }
    return context;
};
