'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Circle, Loader2, ArrowRight } from 'lucide-react';
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
    job_title: string;
    years_experience: string;
    referral_source: string;
}

const JOB_TITLES = [
    { value: 'marketing_manager', label: 'Marketing Manager' },
    { value: 'cmo', label: 'CMO / Marketing Director' },
    { value: 'founder', label: 'Founder / CEO' },
    { value: 'agency_manager', label: 'Agency Manager' },
    { value: 'freelancer', label: 'Freelance Marketer' },
    { value: 'other', label: 'Other' }
];

const YEARS_EXPERIENCE = [
    { value: 'less_than_1', label: 'Less than 1 year' },
    { value: '1_3_years', label: '1-3 years' },
    { value: '3_5_years', label: '3-5 years' },
    { value: '5_plus_years', label: '5+ years' }
];

const REFERRAL_SOURCES = [
    { value: 'google_search', label: 'Google Search' },
    { value: 'facebook_ad', label: 'Facebook Ad' },
    { value: 'friend_referral', label: 'Friend / Colleague Referral' },
    { value: 'agency_recommendation', label: 'Agency Recommendation' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'other', label: 'Other' }
];

export default function UserProfileQuizPage() {
    const router = useRouter();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<QuizAnswers>({
        full_name: '',
        job_title: '',
        years_experience: '',
        referral_source: ''
    });
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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

        // Auto-advance to next question after selection
        setTimeout(() => {
            if (field === 'job_title') {
                setCurrentQuestion(2);
            } else if (field === 'years_experience') {
                setCurrentQuestion(3);
            } else if (field === 'referral_source') {
                // Last question - save to backend
                saveProfile({ ...answers, [field]: value });
            }
        }, 300);
    };

    const saveProfile = async (finalAnswers: QuizAnswers) => {
        setIsSaving(true);
        try {
            await apiClient.patch('/api/v1/users/me/profile', finalAnswers);
            setIsCompleted(true);
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile. Please try again.');
            setIsSaving(false);
        }
    };

    const handleFinish = () => {
        router.push('/en/select-accounts');
    };

    const handleSkip = () => {
        router.push('/en/select-accounts');
    };

    const progressPercent = ((currentQuestion + 1) / 4) * 100;

    const renderQuestion = () => {
        switch (currentQuestion) {
            case 0:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            What should we call you?
                        </h2>
                        <input
                            type="text"
                            value={answers.full_name}
                            onChange={(e) => setAnswers({ ...answers, full_name: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                            placeholder="Enter your name"
                            className="w-full p-4 rounded-xl bg-gray-800 border-2 border-gray-700 text-white text-lg focus:border-blue-500 focus:outline-none"
                            autoFocus
                        />
                        <button
                            onClick={handleNameSubmit}
                            disabled={!answers.full_name.trim()}
                            className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                        >
                            Continue
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                );

            case 1:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            What's your role?
                        </h2>
                        <div className="space-y-3">
                            {JOB_TITLES.map((option) => {
                                const isSelected = answers.job_title === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectAnswer('job_title', option.value)}
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
                                        <span className="text-lg text-white font-medium">{option.label}</span>
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
                            How long have you been running ads?
                        </h2>
                        <div className="space-y-3">
                            {YEARS_EXPERIENCE.map((option) => {
                                const isSelected = answers.years_experience === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectAnswer('years_experience', option.value)}
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
                                        <span className="text-lg text-white font-medium">{option.label}</span>
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
                            How did you hear about us?
                        </h2>
                        <div className="space-y-3">
                            {REFERRAL_SOURCES.map((option) => {
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
                                        <span className="text-lg text-white font-medium">{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {isSaving && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Saving your profile...</span>
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
                                <p className="text-white font-semibold">Syncing Your Ad Data</p>
                                <p className="text-gray-400 text-sm">We're importing your campaigns and performance metrics...</p>
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
                                <p className="text-white font-semibold">Data Sync Complete!</p>
                                <p className="text-gray-400 text-sm">Your ad accounts are ready to view</p>
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
                                        Question {currentQuestion + 1} of 4
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
                                    ← Back to previous question
                                </button>
                            )}
                        </>
                    ) : (
                        /* Completion Screen */
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4">Profile Complete!</h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                Thanks for completing your profile. Let's connect your ad accounts next.
                            </p>

                            <button
                                onClick={handleFinish}
                                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-xl flex items-center gap-2 mx-auto"
                            >
                                Connect Ad Accounts
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Skip Option */}
                {!isCompleted && (
                    <div className="text-center mt-6">
                        <button
                            onClick={handleSkip}
                            className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
                        >
                            Skip for now →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
