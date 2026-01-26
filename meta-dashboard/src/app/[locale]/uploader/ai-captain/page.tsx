"use client";

import React from 'react';
import { CaptainProvider, useCaptain } from './components/CaptainContext';
import { AICaptainChat } from './components/AICaptainChat';
import { AICaptainSummary } from './components/AICaptainSummary';

function CaptainContent() {
    const { state } = useCaptain();

    // Show summary/success/error screens
    if (state.phase === 'summary' || state.phase === 'submitting' || state.phase === 'success' || state.phase === 'error') {
        return <AICaptainSummary />;
    }

    // Show chat (flow_select or conversation)
    return <AICaptainChat />;
}

export default function AICaptainPage() {
    return (
        <CaptainProvider>
            <CaptainContent />
        </CaptainProvider>
    );
}
