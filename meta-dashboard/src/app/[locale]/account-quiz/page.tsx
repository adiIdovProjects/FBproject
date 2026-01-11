'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Circle, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { accountsService, type AccountQuizData } from '@/services/accounts.service';

const PRIMARY_GOALS = [
    { value: 'purchases', label: 'Purchases / Sales' },
    { value: 'leads', label: 'Leads / Sign-ups' },
    { value: 'brand_awareness', label: 'Brand Awareness' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'book_meeting', label: 'Book a Meeting / Appointments' },
    { value: 'other', label: 'Other' }
];

const INDUSTRIES = [
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'saas', label: 'SaaS / Software' },
    { value: 'local_business', label: 'Local Business' },
    { value: 'b2b', label: 'B2B Services' },
    { value: 'agency', label: 'Marketing Agency' },
    { value: 'other', label: 'Other' }
];

const OPTIMIZATION_PRIORITIES = [
    { value: 'scaling', label: 'Scaling campaigns' },
    { value: 'reduce_costs', label: 'Reducing costs' },
    { value: 'improve_creative', label: 'Improving creative performance' },
    { value: 'better_targeting', label: 'Better targeting' },
    { value: 'increase_conversions', label: 'Increasing conversion rate' },
    { value: 'other', label: 'Other' }
];

export default function AccountQuizPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const accountId = searchParams.get('account_id');

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<AccountQuizData>({
        primary_goal: '',
        primary_goal_other: '',
        primary_conversions: [],
        industry: '',
        optimization_priority: ''
    });
    const [conversions, setConversions] = useState<string[]>([]);
    const [isLoadingConversions, setIsLoadingConversions] = useState(true);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch conversion types on mount
    useEffect(() => {
        if (!accountId) {
            router.push('/en/dashboard');
            return;
        }

        const fetchConversions = async () => {
            try {
                const response = await accountsService.getConversionTypes(accountId);
                setConversions(response.data.conversion_types);
            } catch (error) {
                console.error('Error fetching conversions:', error);
            } finally {
                setIsLoadingConversions(false);
            }
        };

        fetchConversions();
    }, [accountId, router]);

    const handleSelectAnswer = (field: keyof AccountQuizData, value: string) => {
        setAnswers({ ...answers, [field]: value });

        // Auto-advance after selection (except for "Other" which needs text input)
        if (value !== 'other') {
            setTimeout(() => {
                if (field === 'primary_goal') {
                    setCurrentQuestion(1);
                } else if (field === 'industry') {
                    setCurrentQuestion(3);
                } else if (field === 'optimization_priority') {
                    // Last question - save
                    saveQuiz({ ...answers, [field]: value });
                }
            }, 300);
        }
    };

    const handleConversionToggle = (conversion: string) => {
        const updated = answers.primary_conversions.includes(conversion)
            ? answers.primary_conversions.filter(c => c !== conversion)
            : [...answers.primary_conversions, conversion];

        setAnswers({ ...answers, primary_conversions: updated });
    };

    const handleConversionsNext = () => {
        if (answers.primary_conversions.length > 0) {
            setCurrentQuestion(2);
        }
    };

    const saveQuiz = async (finalAnswers: AccountQuizData) => {
        if (!accountId) return;

        setIsSaving(true);
        try {
            await accountsService.saveAccountQuiz(accountId, finalAnswers);
            setIsCompleted(true);
        } catch (error) {
            console.error('Error saving quiz:', error);
            alert('Failed to save quiz. Please try again.');
            setIsSaving(false);
        }
    };

    const handleFinish = () => {
        router.push('/en/dashboard');
    };

    if (!accountId) {
        return null;
    }

    const progressPercent = ((currentQuestion + 1) / 4) * 100;

    const renderQuestion = () => {
        switch (currentQuestion) {
            case 0:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            What's your primary advertising goal for this account?
                        </h2>
                        <div className="space-y-3">
                            {PRIMARY_GOALS.map((option) => {
                                const isSelected = answers.primary_goal === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectAnswer('primary_goal', option.value)}
                                        className={`
                                            w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                                            flex items-center gap-4 group
                                            ${isSelected
                                                ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/20'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                                            }
                                        `}
                                    >
                                        <div className="flex-shrink-0">
                                            {isSelected ? (
                                                <CheckCircle className="w-6 h-6 text-purple-400" />
                                            ) : (
                                                <Circle className="w-6 h-6 text-gray-500 group-hover:text-gray-400" />
                                            )}
                                        </div>
                                        <span className="text-lg text-white font-medium">{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {answers.primary_goal === 'other' && (
                            <div className="mt-4">
                                <input
                                    type="text"
                                    value={answers.primary_goal_other || ''}
                                    onChange={(e) => setAnswers({ ...answers, primary_goal_other: e.target.value })}
                                    placeholder="Please specify your goal"
                                    className="w-full p-4 rounded-xl bg-gray-800 border-2 border-gray-700 text-white focus:border-purple-500 focus:outline-none"
                                    autoFocus
                                />
                                <button
                                    onClick={() => setCurrentQuestion(1)}
                                    disabled={!answers.primary_goal_other?.trim()}
                                    className="mt-3 px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                                >
                                    Continue
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                );

            case 1:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            Which conversions matter most to you?
                        </h2>
                        {isLoadingConversions ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                            </div>
                        ) : conversions.length > 0 ? (
                            <>
                                <div className="space-y-3">
                                    {conversions.map((conversion) => {
                                        const isSelected = answers.primary_conversions.includes(conversion);
                                        return (
                                            <button
                                                key={conversion}
                                                onClick={() => handleConversionToggle(conversion)}
                                                className={`
                                                    w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                                                    flex items-center gap-4
                                                    ${isSelected
                                                        ? 'bg-purple-600/20 border-purple-500'
                                                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                                    }
                                                `}
                                            >
                                                <div className="flex-shrink-0">
                                                    {isSelected ? (
                                                        <CheckCircle className="w-6 h-6 text-purple-400" />
                                                    ) : (
                                                        <Circle className="w-6 h-6 text-gray-500" />
                                                    )}
                                                </div>
                                                <span className="text-lg text-white font-medium capitalize">
                                                    {conversion.replace(/_/g, ' ')}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={handleConversionsNext}
                                    disabled={answers.primary_conversions.length === 0}
                                    className="mt-6 px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2"
                                >
                                    Continue
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-400 mb-4">
                                    No conversion data found yet. Your data may still be syncing.
                                </p>
                                <button
                                    onClick={() => setCurrentQuestion(2)}
                                    className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all"
                                >
                                    Skip this question
                                </button>
                            </div>
                        )}
                    </div>
                );

            case 2:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            What industry is this account in?
                        </h2>
                        <div className="space-y-3">
                            {INDUSTRIES.map((option) => {
                                const isSelected = answers.industry === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectAnswer('industry', option.value)}
                                        className={`
                                            w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                                            flex items-center gap-4 group
                                            ${isSelected
                                                ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/20'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                                            }
                                        `}
                                    >
                                        <div className="flex-shrink-0">
                                            {isSelected ? (
                                                <CheckCircle className="w-6 h-6 text-purple-400" />
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
                            What do you want help with most?
                        </h2>
                        <div className="space-y-3">
                            {OPTIMIZATION_PRIORITIES.map((option) => {
                                const isSelected = answers.optimization_priority === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectAnswer('optimization_priority', option.value)}
                                        disabled={isSaving}
                                        className={`
                                            w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                                            flex items-center gap-4 group
                                            ${isSelected
                                                ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/20'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                                            }
                                            ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <div className="flex-shrink-0">
                                            {isSelected ? (
                                                <CheckCircle className="w-6 h-6 text-purple-400" />
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
                                <span>Saving your preferences...</span>
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
                {/* Quiz Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {!isCompleted ? (
                        <>
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">Optimize Your Account</h1>
                                    <p className="text-sm text-gray-400">Help us personalize your experience</p>
                                </div>
                            </div>

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
                                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
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
                            <div className="w-20 h-20 bg-purple-500/20 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Sparkles className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4">Account Optimized!</h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                We'll use your preferences to provide personalized insights and recommendations.
                            </p>

                            <button
                                onClick={handleFinish}
                                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-xl flex items-center gap-2 mx-auto"
                            >
                                Go to Dashboard
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Skip Option */}
                {!isCompleted && (
                    <div className="text-center mt-6">
                        <button
                            onClick={handleFinish}
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
