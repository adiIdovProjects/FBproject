'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, Circle, Loader2, ArrowRight, PlayCircle } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface SyncStatus {
    status: 'not_started' | 'in_progress' | 'completed' | 'failed';
    progress_percent: number;
    started_at: string | null;
    completed_at: string | null;
    error: string | null;
}

interface QuizAnswers {
    full_name: string;
    platform_reason: string;
    company_type: string;
    role_with_ads: string;
    referral_source: string;
}

const PLATFORM_REASON_KEYS = [
    { value: 'manage_easily', key: 'quiz.platform_reasons.manage_easily' },
    { value: 'detailed_analysis', key: 'quiz.platform_reasons.detailed_analysis' },
    { value: 'ai_insights', key: 'quiz.platform_reasons.ai_insights' },
    { value: 'custom_reports', key: 'quiz.platform_reasons.custom_reports' },
    { value: 'save_time', key: 'quiz.platform_reasons.save_time' },
    { value: 'other', key: 'quiz.platform_reasons.other' }
];

const COMPANY_TYPE_KEYS = [
    { value: 'smb', key: 'quiz.company_types.smb' },
    { value: 'freelancer', key: 'quiz.company_types.freelancer' },
    { value: 'own_business', key: 'quiz.company_types.own_business' },
    { value: 'enterprise', key: 'quiz.company_types.enterprise' },
    { value: 'agency', key: 'quiz.company_types.agency' },
    { value: 'other', key: 'quiz.company_types.other' }
];

const ROLE_WITH_ADS_KEYS = [
    { value: 'run_myself', key: 'quiz.role_with_ads.run_myself' },
    { value: 'manage_team', key: 'quiz.role_with_ads.manage_team' },
    { value: 'review_results', key: 'quiz.role_with_ads.review_results' },
    { value: 'learning', key: 'quiz.role_with_ads.learning' },
    { value: 'other', key: 'quiz.role_with_ads.other' }
];

const REFERRAL_SOURCE_KEYS = [
    { value: 'google_search', key: 'quiz.referral.google_search' },
    { value: 'facebook_ad', key: 'quiz.referral.facebook_ad' },
    { value: 'friend_referral', key: 'quiz.referral.friend_referral' },
    { value: 'linkedin', key: 'quiz.referral.linkedin' },
    { value: 'ai_tool', key: 'quiz.referral.ai_tool' },
    { value: 'other', key: 'quiz.referral.other' }
];

export default function UserProfileQuizPage() {
    const router = useRouter();
    const { locale } = useParams();
    const t = useTranslations();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<QuizAnswers>({
        full_name: '',
        platform_reason: '',
        company_type: '',
        role_with_ads: '',
        referral_source: ''
    });
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [customReferralSource, setCustomReferralSource] = useState('');

    // Poll sync status every 2 seconds
    useEffect(() => {
        const checkSyncStatus = async () => {
            try {
                const response = await apiClient.get<SyncStatus>('/api/v1/sync/status');
                setSyncStatus(response.data);
            } catch (error) {
                console.error('Error fetching sync status:', error);
            }
        };

        checkSyncStatus();
        const interval = setInterval(checkSyncStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleNameSubmit = () => {
        if (answers.full_name.trim()) {
            setCurrentQuestion(1);
        }
    };

    const handleSelectAnswer = (field: keyof QuizAnswers, value: string) => {
        setAnswers({ ...answers, [field]: value });

        // Don't auto-advance if "Other" is selected for referral source
        if (field === 'referral_source' && value === 'other') {
            return;
        }

        // Auto-advance to next question after selection
        setTimeout(() => {
            if (field === 'platform_reason') {
                setCurrentQuestion(2);
            } else if (field === 'company_type') {
                setCurrentQuestion(3);
            } else if (field === 'role_with_ads') {
                setCurrentQuestion(4);
            } else if (field === 'referral_source') {
                // Last question - save to backend
                saveProfile({ ...answers, [field]: value });
            }
        }, 300);
    };

    const saveProfile = async (finalAnswers: QuizAnswers) => {
        setIsSaving(true);
        try {
            // Save profile
            await apiClient.patch('/api/v1/users/me/profile', finalAnswers);

            // Mark onboarding as complete
            await apiClient.post('/api/v1/auth/onboarding/complete');

            setIsCompleted(true);
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile. Please try again.');
            setIsSaving(false);
        }
    };

    const handleFinish = () => {
        router.push(`/${locale}/homepage`);
    };

    const progressPercent = ((currentQuestion + 1) / 5) * 100;

    const renderQuestion = () => {
        switch (currentQuestion) {
            case 0:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {t('quiz.what_should_we_call_you')}
                        </h2>
                        <input
                            type="text"
                            value={answers.full_name}
                            onChange={(e) => setAnswers({ ...answers, full_name: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                            placeholder={t('quiz.enter_your_name')}
                            className="w-full p-4 rounded-xl bg-gray-800 border-2 border-gray-700 text-white text-lg focus:border-blue-500 focus:outline-none"
                            autoFocus
                        />
                        <button
                            onClick={handleNameSubmit}
                            disabled={!answers.full_name.trim()}
                            className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                        >
                            {t('auth.continue')}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                );

            case 1:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {t('quiz.why_are_you_here')}
                        </h2>
                        <div className="space-y-3">
                            {PLATFORM_REASON_KEYS.map((option) => {
                                const isSelected = answers.platform_reason === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectAnswer('platform_reason', option.value)}
                                        className={`
                                            w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                                            flex items-center gap-4 group
                                            ${isSelected
                                                ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                                            }
                                        `}
                                    >
                                        <div className="flex-shrink-0">
                                            {isSelected ? (
                                                <CheckCircle className="w-6 h-6 text-blue-400" />
                                            ) : (
                                                <Circle className="w-6 h-6 text-gray-500 group-hover:text-gray-400" />
                                            )}
                                        </div>
                                        <span className="text-lg text-white font-medium">{t(option.key)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {t('quiz.company_type_question')}
                        </h2>
                        <div className="space-y-3">
                            {COMPANY_TYPE_KEYS.map((option) => {
                                const isSelected = answers.company_type === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectAnswer('company_type', option.value)}
                                        className={`
                                            w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                                            flex items-center gap-4 group
                                            ${isSelected
                                                ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                                            }
                                        `}
                                    >
                                        <div className="flex-shrink-0">
                                            {isSelected ? (
                                                <CheckCircle className="w-6 h-6 text-blue-400" />
                                            ) : (
                                                <Circle className="w-6 h-6 text-gray-500 group-hover:text-gray-400" />
                                            )}
                                        </div>
                                        <span className="text-lg text-white font-medium">{t(option.key)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {t('quiz.your_role_with_ads')}
                        </h2>
                        <div className="space-y-3">
                            {ROLE_WITH_ADS_KEYS.map((option) => {
                                const isSelected = answers.role_with_ads === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectAnswer('role_with_ads', option.value)}
                                        className={`
                                            w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                                            flex items-center gap-4 group
                                            ${isSelected
                                                ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                                            }
                                        `}
                                    >
                                        <div className="flex-shrink-0">
                                            {isSelected ? (
                                                <CheckCircle className="w-6 h-6 text-blue-400" />
                                            ) : (
                                                <Circle className="w-6 h-6 text-gray-500 group-hover:text-gray-400" />
                                            )}
                                        </div>
                                        <span className="text-lg text-white font-medium">{t(option.key)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {t('quiz.how_did_you_hear')}
                        </h2>
                        <div className="space-y-3">
                            {REFERRAL_SOURCE_KEYS.map((option) => {
                                const isSelected = answers.referral_source === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectAnswer('referral_source', option.value)}
                                        disabled={isSaving}
                                        className={`
                                            w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                                            flex items-center gap-4 group
                                            ${isSelected
                                                ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                                            }
                                            ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <div className="flex-shrink-0">
                                            {isSelected ? (
                                                <CheckCircle className="w-6 h-6 text-blue-400" />
                                            ) : (
                                                <Circle className="w-6 h-6 text-gray-500 group-hover:text-gray-400" />
                                            )}
                                        </div>
                                        <span className="text-lg text-white font-medium">{t(option.key)}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {answers.referral_source === 'other' && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                <input
                                    type="text"
                                    value={customReferralSource}
                                    onChange={(e) => setCustomReferralSource(e.target.value)}
                                    placeholder={t('quiz.please_specify')}
                                    className="w-full p-4 rounded-xl bg-gray-800 border-2 border-gray-700 text-white text-lg focus:border-blue-500 focus:outline-none mb-4"
                                    autoFocus
                                />
                                <button
                                    onClick={() => saveProfile({ ...answers, referral_source: customReferralSource })}
                                    disabled={!customReferralSource.trim() || isSaving}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : t('quiz.complete_profile')} <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        {isSaving && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>{t('quiz.saving_profile')}</span>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                {/* Sync Status Banner */}
                {syncStatus && syncStatus.status === 'in_progress' && (
                    <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                            <div className="flex-1">
                                <p className="text-white font-semibold">{t('quiz.syncing_data')}</p>
                                <p className="text-gray-400 text-sm">{t('quiz.importing_campaigns')}</p>
                            </div>
                            <span className="text-blue-400 font-bold">{syncStatus.progress_percent}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${syncStatus.progress_percent}%` }}
                            />
                        </div>
                    </div>
                )}

                {syncStatus && syncStatus.status === 'completed' && (
                    <div className="mb-6 bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <div>
                                <p className="text-white font-semibold">{t('quiz.sync_complete')}</p>
                                <p className="text-gray-400 text-sm">{t('quiz.accounts_ready')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quiz Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {!isCompleted ? (
                        <>
                            {/* Progress Bar */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">
                                        {t('quiz.question_of', { current: currentQuestion + 1, total: 5 })}
                                    </span>
                                    <span className="text-sm text-gray-400">{Math.round(progressPercent)}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Question */}
                            {renderQuestion()}

                            {/* Back Button */}
                            {currentQuestion > 0 && !isSaving && (
                                <button
                                    onClick={() => setCurrentQuestion(currentQuestion - 1)}
                                    className="mt-6 text-gray-400 hover:text-gray-300 transition-colors text-sm"
                                >
                                    ← {t('quiz.back_to_previous')}
                                </button>
                            )}
                        </>
                    ) : (
                        /* Completion Screen */
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4">{t('quiz.profile_complete')}</h2>
                            <p className="text-gray-400 mb-6 max-w-md mx-auto">
                                {t('quiz.thanks_completing')}
                            </p>

                            {/* Video Tutorial Placeholder */}
                            <div className="mb-8 max-w-lg mx-auto">
                                <p className="text-gray-400 text-sm mb-3">
                                    {syncStatus?.status !== 'completed'
                                        ? t('quiz.watch_while_preparing')
                                        : t('quiz.get_most_out')}
                                </p>
                                <div className="aspect-video bg-gray-800/50 border border-white/10 rounded-xl flex items-center justify-center">
                                    <div className="text-center p-4">
                                        <PlayCircle className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                                        <p className="text-gray-400 font-medium">{t('quiz.platform_tutorial')}</p>
                                        <p className="text-gray-500 text-sm">{t('quiz.coming_soon')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Conditional Dashboard Button */}
                            {syncStatus?.status === 'completed' || syncStatus?.status === 'not_started' ? (
                                <button
                                    onClick={handleFinish}
                                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-xl flex items-center gap-2 mx-auto"
                                >
                                    {t('quiz.go_to_dashboard')}
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="flex items-center gap-3 text-blue-400">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>{t('quiz.preparing_dashboard')}</span>
                                    </div>
                                    {syncStatus && (
                                        <div className="w-64">
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${syncStatus.progress_percent}%` }}
                                                />
                                            </div>
                                            <p className="text-gray-500 text-xs mt-1">{syncStatus.progress_percent}%</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
