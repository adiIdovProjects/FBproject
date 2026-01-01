import React from 'react';
import { useTranslations } from 'next-intl';
import { AIInvestigator } from '@/components/dashboard/AIInvestigator';
import { MainLayout } from '@/components/MainLayout';

export default function AIInvestigatorPage() {
    const t = useTranslations();

    return (
        <MainLayout
            title={t('ai_investigator') || 'AI Investigator'}
            description="Deep dive into your performance data with natural language queries."
        >
            <AIInvestigator />
        </MainLayout>
    );
}
