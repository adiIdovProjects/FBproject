import React from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/MainLayout';
import { UserSettings } from '@/components/settings/UserSettings';

export default function SettingsPage() {
    const t = useTranslations();

    return (
        <MainLayout
            title={t('nav.settings')}
            description={t('settings.user_settings')}
        >
            <UserSettings />
        </MainLayout>
    );
}
