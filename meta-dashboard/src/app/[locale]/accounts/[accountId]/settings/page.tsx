import React from 'react';
import { getTranslations } from 'next-intl/server';
import { MainLayout } from '@/components/MainLayout';
import { AdAccountSettings } from '@/components/settings/AdAccountSettings';

interface PageProps {
    params: Promise<{
        accountId: string;
        locale: string;
    }>;
}

export default async function AccountSettingsPage({ params }: PageProps) {
    const { accountId } = await params;
    const t = await getTranslations();

    return (
        <MainLayout
            title={t('settings.account_settings')}
            description={t('settings.account_settings_desc')}
        >
            <AdAccountSettings accountId={accountId} />
        </MainLayout>
    );
}
