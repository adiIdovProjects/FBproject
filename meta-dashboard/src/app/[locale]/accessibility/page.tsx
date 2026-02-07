'use client';

import React from 'react';
import LegalPageLayout from '../../../components/legal/LegalPageLayout';
import { useTranslations } from 'next-intl';

export default function AccessibilityStatementPage() {
  const t = useTranslations('accessibility');

  return (
    <LegalPageLayout title={t('title')} lastUpdated="February 2026">
      <h2>{t('commitment_title')}</h2>
      <p>{t('commitment_text')}</p>

      <h2>{t('standards_title')}</h2>
      <p>{t('standards_text')}</p>
      <ul>
        <li>WCAG 2.1 Level AA</li>
        <li>Israeli Standard 5568 (תקן ישראלי 5568)</li>
      </ul>

      <h2>{t('features_title')}</h2>
      <p>{t('features_intro')}</p>
      <ul>
        <li><strong>{t('feature_keyboard_title')}:</strong> {t('feature_keyboard_desc')}</li>
        <li><strong>{t('feature_screen_reader_title')}:</strong> {t('feature_screen_reader_desc')}</li>
        <li><strong>{t('feature_contrast_title')}:</strong> {t('feature_contrast_desc')}</li>
        <li><strong>{t('feature_focus_title')}:</strong> {t('feature_focus_desc')}</li>
        <li><strong>{t('feature_rtl_title')}:</strong> {t('feature_rtl_desc')}</li>
        <li><strong>{t('feature_scaling_title')}:</strong> {t('feature_scaling_desc')}</li>
      </ul>

      <h2>{t('assistive_title')}</h2>
      <p>{t('assistive_text')}</p>
      <ul>
        <li>NVDA (Windows)</li>
        <li>VoiceOver (macOS/iOS)</li>
        <li>JAWS</li>
        <li>TalkBack (Android)</li>
      </ul>

      <h2>{t('contact_title')}</h2>
      <p>{t('contact_text')}</p>
      <ul>
        <li><strong>{t('contact_email')}:</strong> accessibility@example.com</li>
        <li><strong>{t('contact_phone')}:</strong> +972-XX-XXX-XXXX</li>
      </ul>

      <h2>{t('feedback_title')}</h2>
      <p>{t('feedback_text')}</p>

      <h2>{t('ongoing_title')}</h2>
      <p>{t('ongoing_text')}</p>
    </LegalPageLayout>
  );
}
