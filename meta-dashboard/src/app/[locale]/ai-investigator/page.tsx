import React from 'react';
import { useTranslations } from 'next-intl';
import { AIInvestigator } from '@/components/dashboard/AIInvestigator';
import { MainLayout } from '@/components/MainLayout';

export default function AIInvestigatorPage() {
    const t = useTranslations();

    return (
        <MainLayout
            title={t('ai_investigator.title')}
            description={t('ai_investigator.subtitle')}
        >
            <AIInvestigator />
        </MainLayout>
    );
}
