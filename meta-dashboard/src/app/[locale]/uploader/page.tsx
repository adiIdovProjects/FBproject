'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Layers, ArrowRight, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '../../../components/MainLayout';

export default function CampaignChoicePage() {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    const t = useTranslations();

    return (
        <MainLayout
            title={t('nav.uploader')}
            description=""
        >
            <div className="max-w-6xl mx-auto">
                {/* Choice Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Option 1: Create New Campaign */}
                    <div className="p-8 rounded-2xl border-2 border-gray-700 bg-gray-800/50 hover:border-blue-500 transition-all">
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="p-4 rounded-full bg-blue-500/10">
                                <PlusCircle className="w-12 h-12 text-blue-400" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-3">
                                    Create New Campaign
                                </h2>
                                <p className="text-gray-400">
                                    Start from scratch with a brand new campaign. Run with optimal Facebook recommended targeting, set your budget, and choose your objectives. Perfect for launching new products or testing new objectives.
                                </p>
                            </div>

                            <button
                                onClick={() => router.push(`/${locale}/uploader/wizard`)}
                                className="w-full mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                Continue
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Option 2: Add Creative to Existing */}
                    <div className="p-8 rounded-2xl border-2 border-gray-700 bg-gray-800/50 hover:border-purple-500 transition-all">
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="p-4 rounded-full bg-purple-500/10">
                                <Layers className="w-12 h-12 text-purple-400" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-3">
                                    Add Creative to Existing
                                </h2>
                                <p className="text-gray-400">
                                    Add a new ad variation to a campaign that's already running. Keep the same targeting while testing new creatives. Great for A/B testing.
                                </p>
                            </div>

                            <button
                                onClick={() => router.push(`/${locale}/uploader/add-creative`)}
                                className="w-full mt-4 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                Continue
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Option 3: Edit Existing */}
                    <div className="p-8 rounded-2xl border-2 border-gray-700 bg-gray-800/50 hover:border-orange-500 transition-all">
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="p-4 rounded-full bg-orange-500/10">
                                <Pencil className="w-12 h-12 text-orange-400" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-3">
                                    Edit Ad Set or Ad
                                </h2>
                                <p className="text-gray-400">
                                    Modify targeting (location, age, budget) on an ad set, or update ad copy, media, and lead forms. Fine-tune your existing campaigns.
                                </p>
                            </div>

                            <button
                                onClick={() => router.push(`/${locale}/uploader/edit`)}
                                className="w-full mt-4 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                Continue
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
