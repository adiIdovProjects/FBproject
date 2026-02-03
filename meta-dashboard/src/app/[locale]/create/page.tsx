"use client";

/**
 * Create Page - Simplified choice page for creating/updating ads
 * Shows "Add/Update Ads" as primary action (most common)
 * "Create New Campaign" as secondary
 */

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MainLayout2 } from '../../../components/MainLayout2';
import { Card } from '@tremor/react';
import { ImagePlus, Rocket, Wrench } from 'lucide-react';
import Link from 'next/link';

export default function CreatePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  return (
    <MainLayout2 title={t('create_page.title')} description="" compact>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Primary Action: Add/Update Ads */}
        <button
          onClick={() => router.push(`/${locale}/uploader/add-creative`)}
          className="w-full group"
        >
          <Card className="card-gradient border-border-subtle hover:border-accent/50 transition-all p-6 text-left">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                <ImagePlus className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white">{t('create_page.add_ads_title')}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                    {t('create_page.add_ads_hint')}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{t('create_page.add_ads_desc')}</p>
              </div>
            </div>
          </Card>
        </button>

        {/* Secondary Action: Create New Campaign */}
        <button
          onClick={() => router.push(`/${locale}/uploader/ai-captain`)}
          className="w-full group"
        >
          <Card className="card-gradient border-border-subtle hover:border-white/20 transition-all p-6 text-left">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">{t('create_page.new_campaign_title')}</h3>
                <p className="text-gray-400 text-sm">{t('create_page.new_campaign_desc')}</p>
              </div>
            </div>
          </Card>
        </button>

        {/* Build Manually Link */}
        <div className="text-center pt-4 border-t border-white/10">
          <Link
            href={`/${locale}/uploader/wizard`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            <Wrench className="w-4 h-4" />
            {t('create_page.build_manually')}
          </Link>
        </div>
      </div>
    </MainLayout2>
  );
}
