import React from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/MainLayout';
import { AccountSettings } from '@/components/AccountSettings';

export default function SettingsPage() {
    const t = useTranslations();

    return (
        <MainLayout
            title={t('nav.settings')}
            description={t('settings.account_settings')}
        >
            <AccountSettings />
        </MainLayout>
    );
}
