"use client";

import React, { useState } from 'react';
import { X, Loader2, Check, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { mutationsService } from '@/services/mutations.service';

// Available question types for lead forms
const LEAD_FORM_QUESTIONS = [
    { value: 'EMAIL', labelKey: 'captain.form_email', required: true },
    { value: 'FULL_NAME', labelKey: 'captain.form_full_name', required: false },
    { value: 'PHONE_NUMBER', labelKey: 'captain.form_phone', required: false },
    { value: 'CITY', labelKey: 'captain.form_city', required: false },
    { value: 'COUNTRY', labelKey: 'captain.form_country', required: false },
];

interface LeadFormBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onFormCreated: (formId: string) => void;
    pageId: string;
    accountId: string;
}

export const LeadFormBuilder: React.FC<LeadFormBuilderProps> = ({
    isOpen,
    onClose,
    onFormCreated,
    pageId,
    accountId,
}) => {
    const t = useTranslations();

    // Form state
    const [formName, setFormName] = useState('');
    const [formHeadline, setFormHeadline] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [selectedQuestions, setSelectedQuestions] = useState<string[]>(['EMAIL']);
    const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('');

    // UI state
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const toggleQuestion = (questionValue: string) => {
        // EMAIL is always required
        if (questionValue === 'EMAIL') return;

        setSelectedQuestions(prev =>
            prev.includes(questionValue)
                ? prev.filter(q => q !== questionValue)
                : [...prev, questionValue]
        );
    };

    const handleSubmit = async () => {
        // Validation
        if (!formName.trim()) {
            setError('Form name is required');
            return;
        }
        if (selectedQuestions.length === 0) {
            setError('Select at least one question');
            return;
        }
        if (!privacyPolicyUrl.trim()) {
            setError('Privacy policy URL is required');
            return;
        }

        // Validate URL format
        try {
            new URL(privacyPolicyUrl);
        } catch {
            setError('Please enter a valid privacy policy URL');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const result = await mutationsService.createLeadForm(
                pageId,
                formName.trim(),
                selectedQuestions,
                privacyPolicyUrl.trim(),
                accountId,
                {
                    headline: formHeadline.trim() || undefined,
                    description: formDescription.trim() || undefined,
                }
            );

            setSuccess(true);
            setTimeout(() => {
                onFormCreated(result.id);
                onClose();
                // Reset form
                setFormName('');
                setFormHeadline('');
                setFormDescription('');
                setSelectedQuestions(['EMAIL']);
                setPrivacyPolicyUrl('');
                setSuccess(false);
            }, 1000);
        } catch (e: unknown) {
            console.error('Failed to create lead form:', e);
            const errorMessage = (e as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail
                || (e as { message?: string })?.message
                || 'Failed to create lead form';
            setError(errorMessage);
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-lg font-semibold text-white">{t('captain.create_form')}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Error message */}
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Success message */}
                    {success && (
                        <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-400" />
                            <p className="text-sm text-green-300">{t('captain.form_created')}</p>
                        </div>
                    )}

                    {/* Form Name */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">
                            {t('captain.form_name')} <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder={t('captain.form_name_placeholder')}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>

                    {/* Form Headline (optional) */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">
                            {t('captain.form_headline')}
                        </label>
                        <input
                            type="text"
                            value={formHeadline}
                            onChange={(e) => setFormHeadline(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>

                    {/* Form Description (optional) */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">
                            {t('captain.form_description')}
                        </label>
                        <textarea
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            rows={2}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                        />
                    </div>

                    {/* Questions */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            {t('captain.form_questions')} <span className="text-red-400">*</span>
                        </label>
                        <div className="space-y-2">
                            {LEAD_FORM_QUESTIONS.map((question) => (
                                <label
                                    key={question.value}
                                    className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors ${
                                        question.required ? 'opacity-75' : ''
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedQuestions.includes(question.value)}
                                        onChange={() => toggleQuestion(question.value)}
                                        disabled={question.required}
                                        className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-white text-sm">{t(question.labelKey)}</span>
                                    {question.required && (
                                        <span className="text-xs text-gray-500">(required)</span>
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Privacy Policy URL */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">
                            {t('captain.form_privacy_url')} <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="url"
                            value={privacyPolicyUrl}
                            onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                            placeholder={t('captain.form_privacy_placeholder')}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isCreating || success}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('captain.form_creating')}
                            </>
                        ) : success ? (
                            <>
                                <Check className="w-4 h-4" />
                                {t('captain.form_created')}
                            </>
                        ) : (
                            t('captain.create_form')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeadFormBuilder;
