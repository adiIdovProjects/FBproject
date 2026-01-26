"use client";

import { useState, useEffect } from 'react';
import { Upload, CheckCircle, X, Loader2, ExternalLink, RefreshCw, Plus, Copy, Lightbulb, ChevronDown, Image as ImageIcon, LayoutGrid, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { AdCreative, CarouselCardState, useWizard } from './WizardContext';
import { mutationsService, PagePost } from '@/services/mutations.service';
import PostPicker from './PostPicker';

interface LeadForm {
    id: string;
    name: string;
}

// Available question types for lead forms
const LEAD_FORM_QUESTION_TYPES = [
    { value: 'EMAIL', label: 'Email', required: true },
    { value: 'FULL_NAME', label: 'Full Name', required: false },
    { value: 'PHONE_NUMBER', label: 'Phone Number', required: false },
    { value: 'CITY', label: 'City', required: false },
    { value: 'COUNTRY', label: 'Country', required: false },
    { value: 'JOB_TITLE', label: 'Job Title', required: false },
    { value: 'COMPANY_NAME', label: 'Company Name', required: false },
];

interface Props {
    ad: AdCreative;
    index: number;
    canRemove: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
    locale: string;
    pageId: string;
    accountId: string;
}

// CTA options by objective
const CTA_OPTIONS_DEFAULT = [
    'LEARN_MORE',
    'SHOP_NOW',
    'SIGN_UP',
    'GET_OFFER',
    'APPLY_NOW'
];

const CTA_OPTIONS_WHATSAPP = [
    'WHATSAPP_MESSAGE',
    'CONTACT_US',
    'GET_QUOTE'
];

const CTA_OPTIONS_CALLS = [
    'CALL_NOW',
    'CONTACT_US',
    'GET_QUOTE'
];

export default function AdCard({ ad, index, canRemove, t, locale, pageId, accountId }: Props) {
    const { state, dispatch } = useWizard();
    const [previewFormat, setPreviewFormat] = useState<'feed' | 'story'>('feed');
    const [leadForms, setLeadForms] = useState<LeadForm[]>([]);
    const [isLoadingForms, setIsLoadingForms] = useState(false);

    // Lead form builder modal state
    const [showFormBuilder, setShowFormBuilder] = useState(false);
    const [formName, setFormName] = useState('');
    const [formHeadline, setFormHeadline] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [selectedQuestions, setSelectedQuestions] = useState<string[]>(['EMAIL']);
    const [customQuestions, setCustomQuestions] = useState<Array<{ label: string; options: string[]; allow_multiple?: boolean }>>([]);
    const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('');
    const [thankYouTitle, setThankYouTitle] = useState('');
    const [thankYouBody, setThankYouBody] = useState('');
    const [thankYouButtonText, setThankYouButtonText] = useState('');
    const [thankYouUrl, setThankYouUrl] = useState('');
    const [isCreatingForm, setIsCreatingForm] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isDuplicatingForm, setIsDuplicatingForm] = useState(false);
    const [showFormTips, setShowFormTips] = useState(false);
    const [showPostPicker, setShowPostPicker] = useState(false);
    const [carouselPreviewIndex, setCarouselPreviewIndex] = useState(0);

    const isLeadForm = state.objective === 'LEADS' && state.leadType === 'FORM';
    const isWhatsApp = state.objective === 'WHATSAPP';
    const isCalls = state.objective === 'CALLS';
    const needsUrl = !isLeadForm && !isWhatsApp && !isCalls;

    // Validation checks for checklist
    const usingExistingPost = !!ad.useExistingPost && !!ad.objectStoryId;
    const isCarouselMode = !!ad.isCarousel;
    const carouselCards = ad.carouselCards || [];
    const hasCarouselMedia = isCarouselMode && carouselCards.length >= 2 && carouselCards.every(c => c.file || c.previewUrl);
    const hasMedia = usingExistingPost || (isCarouselMode ? hasCarouselMedia : (!!ad.file || !!ad.existingImageUrl));
    const hasTitle = usingExistingPost || (ad.title.length > 0 && ad.title.length <= 40);
    const hasBody = usingExistingPost || ad.body.length > 0;
    const hasDestination = isLeadForm ? !!ad.leadFormId : (needsUrl ? !!ad.link : true);
    const hasCTA = usingExistingPost || !!ad.cta;

    // Get CTA options based on objective
    const getCTAOptions = () => {
        if (isWhatsApp) return CTA_OPTIONS_WHATSAPP;
        if (isCalls) return CTA_OPTIONS_CALLS;
        return CTA_OPTIONS_DEFAULT;
    };
    const ctaOptions = getCTAOptions();

    // Load lead forms if needed
    useEffect(() => {
        if (isLeadForm && pageId && accountId) {
            loadLeadForms();
        }
    }, [isLeadForm, pageId, accountId]);

    const loadLeadForms = async () => {
        setIsLoadingForms(true);
        try {
            const forms = await mutationsService.getLeadForms(pageId, accountId);
            setLeadForms(forms);
            // Auto-select first form if available and none selected
            if (forms.length > 0 && !ad.leadFormId) {
                updateAd({ leadFormId: forms[0].id });
            }
        } catch (e) {
            console.error('Failed to load lead forms:', e);
        } finally {
            setIsLoadingForms(false);
        }
    };

    const updateAd = (updates: Partial<AdCreative>) => {
        dispatch({ type: 'UPDATE_AD', id: ad.id, updates });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? 4 * 1024 * 1024 * 1024 : 30 * 1024 * 1024; // 4GB for video, 30MB for image

        if (file.size > maxSize) {
            alert(isVideo ? 'Video must be under 4GB' : 'Image must be under 30MB');
            return;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);

        updateAd({ file, previewUrl });
    };

    const removeAd = () => {
        if (canRemove) {
            dispatch({ type: 'REMOVE_AD', id: ad.id });
        }
    };

    const handleSelectExistingPost = (post: PagePost) => {
        updateAd({
            useExistingPost: true,
            objectStoryId: post.id,
            objectStoryPreview: {
                thumbnail: post.full_picture,
                message: post.message,
                source: post.source
            },
            // Clear upload-related fields when using existing post
            file: null,
            previewUrl: post.full_picture || null
        });
        setShowPostPicker(false);
    };

    const handleSwitchToNewAd = () => {
        updateAd({
            useExistingPost: false,
            objectStoryId: undefined,
            objectStoryPreview: undefined,
            previewUrl: null  // Clear the preview image from existing post
        });
    };

    // Toggle carousel mode
    const toggleCarouselMode = (enabled: boolean) => {
        if (enabled) {
            // Initialize with 2 empty cards (minimum for carousel)
            updateAd({
                isCarousel: true,
                carouselCards: [
                    { id: crypto.randomUUID(), file: null, previewUrl: null, title: '' },
                    { id: crypto.randomUUID(), file: null, previewUrl: null, title: '' }
                ],
                file: null,
                previewUrl: null
            });
        } else {
            updateAd({
                isCarousel: false,
                carouselCards: []
            });
        }
        setCarouselPreviewIndex(0);
    };

    // Add carousel card
    const addCarouselCard = () => {
        if (carouselCards.length >= 10) return;
        const newCard: CarouselCardState = {
            id: crypto.randomUUID(),
            file: null,
            previewUrl: null,
            title: ''
        };
        updateAd({ carouselCards: [...carouselCards, newCard] });
    };

    // Remove carousel card
    const removeCarouselCard = (cardId: string) => {
        if (carouselCards.length <= 2) return; // Minimum 2 cards
        const newCards = carouselCards.filter(c => c.id !== cardId);
        updateAd({ carouselCards: newCards });
        if (carouselPreviewIndex >= newCards.length) {
            setCarouselPreviewIndex(Math.max(0, newCards.length - 1));
        }
    };

    // Update carousel card
    const updateCarouselCard = (cardId: string, updates: Partial<CarouselCardState>) => {
        const newCards = carouselCards.map(c => c.id === cardId ? { ...c, ...updates } : c);
        updateAd({ carouselCards: newCards });
    };

    // Handle carousel card file upload
    const handleCarouselFileChange = (cardId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? 4 * 1024 * 1024 * 1024 : 30 * 1024 * 1024;

        if (file.size > maxSize) {
            alert(isVideo ? 'Video must be under 4GB' : 'Image must be under 30MB');
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        updateCarouselCard(cardId, { file, previewUrl });
    };

    // Create lead form via API
    const handleCreateForm = async () => {
        if (!formName.trim()) {
            setFormError(t('wizard_simple.form_name_required') || 'Form name is required');
            return;
        }
        if (selectedQuestions.length === 0) {
            setFormError(t('wizard_simple.select_questions') || 'Select at least one question');
            return;
        }
        if (!privacyPolicyUrl.trim()) {
            setFormError(t('wizard_simple.privacy_url_required') || 'Privacy policy URL is required');
            return;
        }

        setIsCreatingForm(true);
        setFormError(null);

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
                    customQuestions: customQuestions.length > 0
                        ? customQuestions.map(cq => ({
                            label: cq.label,
                            field_type: 'SELECT',  // Always Multiple Choice
                            options: cq.options.filter(o => o.trim()),  // Filter empty options
                            allow_multiple: cq.allow_multiple
                        }))
                        : undefined,
                    thankYouTitle: thankYouTitle.trim() || undefined,
                    thankYouBody: thankYouBody.trim() || undefined,
                    thankYouButtonText: thankYouButtonText.trim() || undefined,
                    thankYouUrl: thankYouUrl.trim() || undefined,
                }
            );

            // Auto-select the new form
            updateAd({ leadFormId: result.id });

            // Refresh the forms list
            await loadLeadForms();

            // Close modal and reset all fields
            setShowFormBuilder(false);
            resetFormBuilder();
        } catch (e: any) {
            console.error('Failed to create lead form:', e);
            // Extract error message from Axios response or fall back to generic message
            const errorMessage = e?.response?.data?.detail
                || e?.message
                || (t('wizard_simple.form_create_error') || 'Failed to create lead form');
            setFormError(errorMessage);
        } finally {
            setIsCreatingForm(false);
        }
    };

    // Reset form builder state
    const resetFormBuilder = () => {
        setFormName('');
        setFormHeadline('');
        setFormDescription('');
        setSelectedQuestions(['EMAIL']);
        setCustomQuestions([]);
        setPrivacyPolicyUrl('');
        setThankYouTitle('');
        setThankYouBody('');
        setThankYouButtonText('');
        setThankYouUrl('');
        setFormError(null);
    };

    // Duplicate existing form - fetch details and pre-fill form builder
    const handleDuplicateForm = async (formId: string) => {
        setIsDuplicatingForm(true);
        setFormError(null);

        // Validate inputs before making API call
        if (!formId) {
            setFormError('No form selected to duplicate.');
            setIsDuplicatingForm(false);
            return;
        }
        if (!pageId) {
            setFormError('No Facebook Page is connected to this account. Please connect a page first.');
            setIsDuplicatingForm(false);
            return;
        }

        try {
            const details = await mutationsService.getLeadFormDetails(formId, pageId, accountId);

            // Pre-fill form builder with fetched data
            setFormName(`${details.name} (Copy)`);
            setFormHeadline(details.headline || '');
            setFormDescription(details.description || '');
            setSelectedQuestions(details.questions.length > 0 ? details.questions : ['EMAIL']);
            setCustomQuestions(details.custom_questions.map(cq => ({
                label: cq.label,
                options: cq.options,
                allow_multiple: cq.allow_multiple
            })));
            setPrivacyPolicyUrl(details.privacy_policy_url || '');
            setThankYouTitle(details.thank_you_title || '');
            setThankYouBody(details.thank_you_body || '');
            setThankYouButtonText(details.thank_you_button_text || '');
            setThankYouUrl(details.thank_you_url || '');

            // Open the form builder modal
            setShowFormBuilder(true);
        } catch (e: any) {
            console.error('Failed to load form details:', e);
            const errorMessage = e?.response?.data?.detail || e?.message || 'Failed to load form details';
            setFormError(errorMessage);
        } finally {
            setIsDuplicatingForm(false);
        }
    };

    // Add custom question (always Multiple Choice)
    const addCustomQuestion = () => {
        setCustomQuestions(prev => [...prev, { label: '', options: [''], allow_multiple: false }]);
    };

    // Update custom question
    const updateCustomQuestion = (index: number, updates: Partial<{ label: string; options: string[]; allow_multiple?: boolean }>) => {
        setCustomQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
    };

    // Remove custom question
    const removeCustomQuestion = (index: number) => {
        setCustomQuestions(prev => prev.filter((_, i) => i !== index));
    };

    // Add an option to a custom question
    const addOptionToQuestion = (questionIndex: number) => {
        setCustomQuestions(prev => prev.map((q, i) =>
            i === questionIndex
                ? { ...q, options: [...q.options, ''] }
                : q
        ));
    };

    // Update a specific option in a custom question
    const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
        setCustomQuestions(prev => prev.map((q, i) =>
            i === questionIndex
                ? { ...q, options: q.options.map((opt, oi) => oi === optionIndex ? value : opt) }
                : q
        ));
    };

    // Remove an option from a custom question
    const removeOption = (questionIndex: number, optionIndex: number) => {
        setCustomQuestions(prev => prev.map((q, i) =>
            i === questionIndex
                ? { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) }
                : q
        ));
    };

    const toggleQuestion = (questionType: string) => {
        // EMAIL is always required
        if (questionType === 'EMAIL') return;

        setSelectedQuestions(prev =>
            prev.includes(questionType)
                ? prev.filter(q => q !== questionType)
                : [...prev, questionType]
        );
    };

    // Facebook lead form creator URL (fallback)
    const leadFormCreatorUrl = `https://business.facebook.com/publishing_tools/?ref=redirect`;

    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-200">
                    {t('wizard_simple.ad_number', { number: index + 1 })}
                </h3>
                <div className="flex items-center gap-2">
                    {/* Toggle: Create New vs Use Existing Post */}
                    <div className="flex bg-gray-800 rounded-lg p-0.5">
                        <button
                            type="button"
                            onClick={handleSwitchToNewAd}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                !ad.useExistingPost
                                    ? 'bg-blue-500 text-white'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {t('wizard_simple.create_new') || 'Create New'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPostPicker(true)}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                ad.useExistingPost
                                    ? 'bg-blue-500 text-white'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {t('wizard_simple.use_existing') || 'Use Existing Post'}
                        </button>
                    </div>
                    {/* Toggle: Single vs Carousel (only when creating new) */}
                    {!ad.useExistingPost && (
                        <div className="flex bg-gray-800 rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => toggleCarouselMode(false)}
                                className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                                    !isCarouselMode
                                        ? 'bg-purple-500 text-white'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <ImageIcon className="w-3 h-3" />
                                {t('wizard_simple.single') || 'Single'}
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleCarouselMode(true)}
                                className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                                    isCarouselMode
                                        ? 'bg-purple-500 text-white'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <LayoutGrid className="w-3 h-3" />
                                {t('wizard_simple.carousel') || 'Carousel'}
                            </button>
                        </div>
                    )}
                    {canRemove && (
                        <button
                            type="button"
                            onClick={removeAd}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Inputs */}
                <div className="space-y-3">
                    {/* Existing Post Mode */}
                    {ad.useExistingPost ? (
                        <div className="border-2 border-blue-500/30 bg-blue-500/5 rounded-xl p-4">
                            {ad.objectStoryPreview ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-blue-400 text-xs font-medium">
                                        <CheckCircle className="w-4 h-4" />
                                        {ad.objectStoryPreview.source === 'instagram'
                                            ? (t('wizard_simple.using_instagram_post') || 'Using Instagram post')
                                            : (t('wizard_simple.using_facebook_post') || 'Using Facebook post')
                                        }
                                    </div>
                                    {ad.objectStoryPreview.thumbnail && (
                                        <img
                                            src={ad.objectStoryPreview.thumbnail}
                                            alt="Selected post"
                                            className="w-full aspect-video object-cover rounded-lg"
                                        />
                                    )}
                                    <p className="text-sm text-gray-300 line-clamp-2">
                                        {ad.objectStoryPreview.message || '(No caption)'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setShowPostPicker(true)}
                                        className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        {t('wizard_simple.change_post') || 'Change post'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowPostPicker(true)}
                                    className="w-full flex flex-col items-center gap-2 py-4"
                                >
                                    <ImageIcon className="w-8 h-8 text-blue-400" />
                                    <p className="text-blue-400 text-sm font-medium">
                                        {t('wizard_simple.select_existing_post') || 'Select an existing post'}
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                        {t('wizard_simple.existing_post_hint') || 'Preserves likes, comments and shares'}
                                    </p>
                                </button>
                            )}
                        </div>
                    ) : isCarouselMode ? (
                        /* Carousel Mode - Multiple Cards */
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-purple-400 font-medium flex items-center gap-1">
                                    <LayoutGrid className="w-3 h-3" />
                                    {t('wizard_simple.carousel_cards') || 'Carousel Cards'} ({carouselCards.length}/10)
                                </span>
                                {carouselCards.length < 10 && (
                                    <button
                                        type="button"
                                        onClick={addCarouselCard}
                                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" />
                                        {t('wizard_simple.add_card') || 'Add Card'}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {carouselCards.map((card, idx) => (
                                    <div key={card.id} className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400 font-medium">
                                                {t('wizard_simple.card') || 'Card'} {idx + 1}
                                            </span>
                                            {carouselCards.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCarouselCard(card.id)}
                                                    className="text-gray-500 hover:text-red-400 p-1"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        {/* Card Image Upload */}
                                        <div className="border border-dashed border-gray-600 rounded-lg p-2 text-center hover:border-purple-500 transition-colors relative">
                                            <input
                                                type="file"
                                                accept="image/*,video/*"
                                                onChange={(e) => handleCarouselFileChange(card.id, e)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="flex items-center gap-2 pointer-events-none">
                                                {card.previewUrl ? (
                                                    <>
                                                        <img src={card.previewUrl} alt="" className="w-10 h-10 object-cover rounded" />
                                                        <span className="text-xs text-green-400 truncate flex-1">
                                                            {card.file?.name || (t('wizard_simple.image_selected') || 'Image selected')}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-4 h-4 text-gray-500" />
                                                        <span className="text-xs text-gray-500">
                                                            {t('wizard_simple.upload_card_image') || 'Upload image'}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {/* Card Title */}
                                        <input
                                            type="text"
                                            value={card.title}
                                            onChange={(e) => updateCarouselCard(card.id, { title: e.target.value })}
                                            placeholder={t('wizard_simple.card_title') || 'Card headline'}
                                            className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs focus:border-purple-500 outline-none"
                                            maxLength={40}
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500">
                                {t('wizard_simple.carousel_hint') || 'Minimum 2 cards, maximum 10 cards'}
                            </p>
                        </div>
                    ) : (
                        /* File Upload - Normal Single Mode */
                        <div className="border-2 border-dashed border-gray-700 rounded-xl p-4 text-center hover:border-blue-500 transition-colors relative">
                            <input
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-2 pointer-events-none">
                                {ad.file ? (
                                    <>
                                        <CheckCircle className="w-6 h-6 text-green-500" />
                                        <p className="font-medium text-green-400 text-xs truncate max-w-full">
                                            {ad.file.name}
                                        </p>
                                    </>
                                ) : ad.existingImageUrl ? (
                                    <>
                                        <CheckCircle className="w-6 h-6 text-blue-500" />
                                        <p className="font-medium text-blue-400 text-xs">
                                            {t('wizard_simple.using_existing_image') || 'Using existing image'}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            {t('wizard_simple.click_to_replace') || 'Click to replace'}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-gray-500" />
                                        <p className="text-gray-400 text-xs">{t('wizard.upload_media')}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Primary Text - Only show when NOT using existing post */}
                    {!ad.useExistingPost && (
                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold">
                                {t('wizard.primary_text')}
                            </label>
                            <textarea
                                value={ad.body}
                                onChange={(e) => updateAd({ body: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 h-16 focus:border-blue-500 outline-none resize-none text-sm"
                                placeholder={t('wizard.primary_text_placeholder')}
                            />
                        </div>
                    )}

                    {/* Headline - Only show when NOT using existing post */}
                    {!ad.useExistingPost && (
                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold">
                                {t('wizard.headline')}
                            </label>
                            <input
                                value={ad.title}
                                onChange={(e) => updateAd({ title: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:border-blue-500 outline-none text-sm"
                                placeholder={t('wizard.headline_placeholder')}
                                maxLength={40}
                            />
                            <span className="text-xs text-gray-500">{ad.title.length}/40</span>
                        </div>
                    )}

                    {/* URL and CTA fields - show when using existing post AND needs URL (SALES, TRAFFIC, ENGAGEMENT, LEADS+WEBSITE) */}
                    {ad.useExistingPost && needsUrl && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold">
                                    {t('wizard.website_url')} <span className="text-gray-500 text-xs font-normal">({t('wizard_simple.optional') || 'Optional'})</span>
                                </label>
                                <input
                                    value={ad.link}
                                    onChange={(e) => updateAd({ link: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:border-blue-500 outline-none text-sm"
                                    placeholder="https://yourwebsite.com"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('wizard_simple.existing_post_url_hint') || 'Add a destination URL for the CTA button'}
                                </p>
                            </div>
                            {/* CTA selector - only show if URL is provided */}
                            {ad.link && (
                                <div>
                                    <label className="text-xs uppercase text-gray-500 font-bold">
                                        {t('wizard.call_to_action')}
                                    </label>
                                    <select
                                        value={ad.cta}
                                        onChange={(e) => updateAd({ cta: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:border-blue-500 outline-none text-sm"
                                    >
                                        {ctaOptions.map((cta) => (
                                            <option key={cta} value={cta}>
                                                {t(`wizard.cta_${cta.toLowerCase()}`) || cta.replace(/_/g, ' ')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lead Form selector - show when using existing post AND LEADS+FORM objective */}
                    {ad.useExistingPost && isLeadForm && (
                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold text-blue-400">
                                {t('wizard.instant_form_label')} <span className="text-red-400">*</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                {t('wizard_simple.existing_post_form_hint') || 'Select a lead form - clicking the ad will open this form'}
                            </p>
                            {isLoadingForms ? (
                                <div className="flex items-center gap-2 text-sm text-blue-400 py-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('wizard.loading_forms')}
                                </div>
                            ) : leadForms.length > 0 ? (
                                <div className="space-y-2">
                                    <select
                                        value={ad.leadFormId}
                                        onChange={(e) => updateAd({ leadFormId: e.target.value })}
                                        className="w-full bg-gray-900 border border-blue-500/30 rounded-lg p-2 focus:border-blue-500 outline-none text-sm"
                                        required
                                    >
                                        <option value="">{t('wizard.select_form')}</option>
                                        {leadForms.map((form) => (
                                            <option key={form.id} value={form.id}>{form.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={loadLeadForms}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            {t('wizard_simple.refresh_forms') || 'Refresh'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowFormBuilder(true)}
                                            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            {t('wizard_simple.create_lead_form') || 'Create New Form'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm text-yellow-400">
                                        {t('wizard_simple.no_forms_found') || 'No lead forms found'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={loadLeadForms}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            {t('wizard_simple.refresh_forms') || 'Refresh'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowFormBuilder(true)}
                                            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            {t('wizard_simple.create_lead_form') || 'Create New Form'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* URL, Lead Form, or No Destination (WhatsApp/Calls) - Only show when NOT using existing post */}
                    {!ad.useExistingPost && (
                        (isWhatsApp || isCalls) ? (
                        <div className={`p-3 rounded-lg border ${isWhatsApp ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                            <p className={`text-sm ${isWhatsApp ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {isWhatsApp
                                    ? (t('wizard.whatsapp_destination_note') || 'Users will message you on WhatsApp when they click the ad')
                                    : (t('wizard.calls_destination_note') || 'Users will call your business phone number when they click the ad')
                                }
                            </p>
                        </div>
                    ) : needsUrl ? (
                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold">
                                {t('wizard.website_url')}
                            </label>
                            <input
                                value={ad.link}
                                onChange={(e) => updateAd({ link: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:border-blue-500 outline-none text-sm"
                                placeholder="https://yourwebsite.com"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold text-blue-400">
                                {t('wizard.instant_form_label')} <span className="text-red-400">*</span>
                            </label>

                            {/* Lead Form Tips Panel */}
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg my-2">
                                <button
                                    type="button"
                                    onClick={() => setShowFormTips(!showFormTips)}
                                    className="flex items-center gap-2 text-blue-400 text-sm w-full"
                                >
                                    <Lightbulb className="w-4 h-4" />
                                    <span>{t('wizard_simple.form_tips_title') || 'Tips for Better Lead Forms'}</span>
                                    <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showFormTips ? 'rotate-180' : ''}`} />
                                </button>
                                {showFormTips && (
                                    <ul className="mt-2 text-xs text-gray-400 space-y-1 pl-6">
                                        <li>• {t('wizard_simple.form_tip_1') || 'Ask 2-3 qualifying questions to filter out low-quality leads'}</li>
                                        <li>• {t('wizard_simple.form_tip_2') || "Use 'Higher Intent' form type for more serious leads (they confirm info)"}</li>
                                        <li>• {t('wizard_simple.form_tip_3') || "Facebook's algorithm learns what good leads look like from your responses"}</li>
                                    </ul>
                                )}
                            </div>

                            {isLoadingForms ? (
                                <div className="flex items-center gap-2 text-sm text-blue-400 py-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('wizard.loading_forms')}
                                </div>
                            ) : leadForms.length > 0 ? (
                                <div className="space-y-2">
                                    <select
                                        value={ad.leadFormId}
                                        onChange={(e) => updateAd({ leadFormId: e.target.value })}
                                        className="w-full bg-gray-900 border border-blue-500/30 rounded-lg p-2 focus:border-blue-500 outline-none text-sm"
                                        required
                                    >
                                        <option value="">{t('wizard.select_form')}</option>
                                        {leadForms.map((form) => (
                                            <option key={form.id} value={form.id}>{form.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={loadLeadForms}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            {t('wizard_simple.refresh_forms') || 'Refresh'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowFormBuilder(true)}
                                            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            {t('wizard_simple.create_lead_form') || 'Create New Form'}
                                        </button>
                                        {ad.leadFormId && (
                                            <button
                                                type="button"
                                                onClick={() => handleDuplicateForm(ad.leadFormId)}
                                                disabled={isDuplicatingForm}
                                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isDuplicatingForm ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                                {t('wizard_simple.duplicate_form') || 'Duplicate Form'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm text-yellow-400">
                                        {t('wizard_simple.no_forms_found') || 'No lead forms found'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={loadLeadForms}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            {t('wizard_simple.refresh_forms') || 'Refresh'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowFormBuilder(true)}
                                            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            {t('wizard_simple.create_lead_form') || 'Create New Form'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                    )}

                    {/* CTA - Only show when NOT using existing post */}
                    {!ad.useExistingPost && (
                        <div>
                        <label className="text-xs uppercase text-gray-500 font-bold">
                            {t('wizard.call_to_action')}
                        </label>
                        <select
                            value={ad.cta}
                            onChange={(e) => updateAd({ cta: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:border-blue-500 outline-none text-sm"
                        >
                            {ctaOptions.map((cta) => (
                                <option key={cta} value={cta}>
                                    {t(`wizard.cta_${cta.toLowerCase()}`) || cta.replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>
                        </div>
                    )}
                </div>

                {/* Preview */}
                <div className="space-y-3">
                    {/* Format Toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setPreviewFormat('feed')}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                                previewFormat === 'feed'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {t('wizard.preview_feed')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreviewFormat('story')}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                                previewFormat === 'story'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {t('wizard.preview_story')}
                        </button>
                    </div>

                    {/* Feed Preview */}
                    {previewFormat === 'feed' && (
                        <div className="bg-white rounded-lg overflow-hidden shadow-lg border border-gray-800 text-black">
                            <div className="bg-gray-100 p-2 border-b flex items-center gap-2">
                                <div className="w-5 h-5 bg-gray-300 rounded-full" />
                                <div className="h-2 w-16 bg-gray-300 rounded" />
                            </div>
                            <div className="p-2">
                                <p className="text-xs text-gray-800 line-clamp-2">
                                    {ad.body || "Your ad text here..."}
                                </p>
                            </div>
                            {isCarouselMode && carouselCards.length > 0 ? (
                                /* Carousel Preview */
                                <div className="relative">
                                    <div className="bg-gray-200 aspect-square w-full flex items-center justify-center overflow-hidden">
                                        {carouselCards[carouselPreviewIndex]?.previewUrl ? (
                                            <img
                                                src={carouselCards[carouselPreviewIndex].previewUrl!}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <p className="text-gray-400 text-xs">{t('wizard_simple.card') || 'Card'} {carouselPreviewIndex + 1}</p>
                                        )}
                                    </div>
                                    {/* Carousel Navigation */}
                                    <div className="absolute inset-y-0 left-0 flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => setCarouselPreviewIndex(Math.max(0, carouselPreviewIndex - 1))}
                                            disabled={carouselPreviewIndex === 0}
                                            className="bg-white/80 p-1 rounded-full ml-1 disabled:opacity-30"
                                        >
                                            <ChevronLeft className="w-4 h-4 text-gray-800" />
                                        </button>
                                    </div>
                                    <div className="absolute inset-y-0 right-0 flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => setCarouselPreviewIndex(Math.min(carouselCards.length - 1, carouselPreviewIndex + 1))}
                                            disabled={carouselPreviewIndex === carouselCards.length - 1}
                                            className="bg-white/80 p-1 rounded-full mr-1 disabled:opacity-30"
                                        >
                                            <ChevronRight className="w-4 h-4 text-gray-800" />
                                        </button>
                                    </div>
                                    {/* Dots indicator */}
                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                                        {carouselCards.map((_, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setCarouselPreviewIndex(idx)}
                                                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                                    idx === carouselPreviewIndex ? 'bg-blue-500' : 'bg-gray-400'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    {/* Card title below image */}
                                    <div className="bg-gray-100 p-2">
                                        <h4 className="font-bold text-gray-900 truncate text-xs">
                                            {carouselCards[carouselPreviewIndex]?.title || `Card ${carouselPreviewIndex + 1}`}
                                        </h4>
                                    </div>
                                </div>
                            ) : (
                                /* Single Image/Video Preview */
                                <>
                                    <div className="bg-gray-200 aspect-video w-full flex items-center justify-center overflow-hidden">
                                        {ad.previewUrl ? (
                                            ad.file?.type.startsWith('video') ? (
                                                <video
                                                    src={ad.previewUrl}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                    playsInline
                                                />
                                            ) : (
                                                <img src={ad.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                            )
                                        ) : (
                                            <p className="text-gray-400 text-xs">Preview</p>
                                        )}
                                    </div>
                                    <div className="bg-gray-100 p-2 flex justify-between items-center">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className="text-[8px] text-gray-500 uppercase truncate">
                                                {isLeadForm ? 'FACEBOOK' : 'WEBSITE'}
                                            </p>
                                            <h4 className="font-bold text-gray-900 truncate text-xs">
                                                {ad.title || "Headline"}
                                            </h4>
                                        </div>
                                        <span className="bg-gray-300 px-2 py-0.5 rounded text-[10px] font-semibold text-gray-700">
                                            {ad.cta.replace('_', ' ')}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Story Preview */}
                    {previewFormat === 'story' && (
                        <div className="bg-black rounded-lg overflow-hidden shadow-lg border border-gray-800 aspect-[9/16] max-h-[250px] relative">
                            {ad.previewUrl ? (
                                ad.file?.type.startsWith('video') ? (
                                    <video
                                        src={ad.previewUrl}
                                        className="w-full h-full object-cover"
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <img src={ad.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                )
                            ) : (
                                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                    <p className="text-gray-500 text-xs">Preview</p>
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-white text-[10px] mb-1 line-clamp-1">{ad.body || "Your ad text..."}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-white text-xs font-bold truncate flex-1">
                                        {ad.title || "Headline"}
                                    </span>
                                    <span className="bg-white text-black px-2 py-0.5 rounded text-[10px] font-semibold ml-1">
                                        {ad.cta.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Ad Checklist */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-800">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${hasMedia ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {hasMedia ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                    {isCarouselMode
                        ? (t('wizard_simple.carousel_media') || `Carousel (${carouselCards.filter(c => c.previewUrl).length}/${carouselCards.length})`)
                        : (t('wizard.media') || 'Media')
                    }
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${hasBody ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {hasBody ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                    {t('wizard.primary_text') || 'Primary Text'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${hasTitle ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {hasTitle ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                    {t('wizard.headline') || 'Headline'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${hasCTA ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {hasCTA ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                    {t('wizard.cta') || 'CTA'}
                </span>
                {(needsUrl || isLeadForm) && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${hasDestination ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                        {hasDestination ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                        {isLeadForm ? (t('wizard.lead_form') || 'Lead Form') : (t('wizard.url') || 'URL')}
                    </span>
                )}
            </div>

            {/* Lead Form Builder Modal */}
            {showFormBuilder && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-lg w-full p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">
                                {t('wizard_simple.create_lead_form') || 'Create Lead Form'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => { setShowFormBuilder(false); resetFormBuilder(); }}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {formError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Form Name */}
                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">
                                    {t('wizard_simple.form_name') || 'Form Name'} <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder={t('wizard_simple.form_name_placeholder') || 'My Lead Form'}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                                />
                            </div>

                            {/* Form Intro Section */}
                            <div className="border-t border-gray-700 pt-4">
                                <h4 className="text-sm font-semibold text-gray-300 mb-3">
                                    {t('wizard_simple.form_intro') || 'Form Introduction'} <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">
                                            {t('wizard_simple.form_headline') || 'Headline'}
                                        </label>
                                        <input
                                            type="text"
                                            value={formHeadline}
                                            onChange={(e) => setFormHeadline(e.target.value)}
                                            placeholder={t('wizard_simple.form_headline_placeholder') || 'Get more info'}
                                            maxLength={60}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                                        />
                                        <span className="text-xs text-gray-500">{formHeadline.length}/60</span>
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">
                                            {t('wizard_simple.form_description') || 'Description'}
                                        </label>
                                        <textarea
                                            value={formDescription}
                                            onChange={(e) => setFormDescription(e.target.value)}
                                            placeholder={t('wizard_simple.form_description_placeholder') || 'Tell users what they\'ll get...'}
                                            maxLength={800}
                                            rows={2}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:border-blue-500 outline-none resize-none"
                                        />
                                        <span className="text-xs text-gray-500">{formDescription.length}/800</span>
                                    </div>
                                </div>
                            </div>

                            {/* Standard Questions */}
                            <div className="border-t border-gray-700 pt-4">
                                <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">
                                    {t('wizard_simple.form_questions') || 'Questions to Ask'} <span className="text-red-400">*</span>
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    {t('wizard_simple.form_hint_questions') || 'More questions = fewer but higher quality leads'}
                                </p>
                                <div className="space-y-2">
                                    {LEAD_FORM_QUESTION_TYPES.map((q) => (
                                        <label
                                            key={q.value}
                                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                                                q.required ? 'bg-blue-500/10' : 'hover:bg-gray-800'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedQuestions.includes(q.value)}
                                                onChange={() => toggleQuestion(q.value)}
                                                disabled={q.required}
                                                className="w-4 h-4 accent-blue-500"
                                            />
                                            <span className="text-sm text-white">{q.label}</span>
                                            {q.required && (
                                                <span className="text-xs text-blue-400 ml-auto">
                                                    {t('wizard_simple.required') || 'Required'}
                                                </span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Questions */}
                            <div className="border-t border-gray-700 pt-4">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-semibold text-gray-300">
                                        {t('wizard_simple.custom_questions') || 'Custom Questions'} <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={addCustomQuestion}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" />
                                        {t('wizard_simple.add_question') || 'Add Question'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mb-3">
                                    {t('wizard_simple.form_hint_custom') || "Add questions like 'What's your budget?' to pre-qualify"}
                                </p>
                                {customQuestions.length === 0 ? (
                                    <p className="text-xs text-gray-500">
                                        {t('wizard_simple.no_custom_questions') || 'No custom questions added'}
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {customQuestions.map((cq, idx) => (
                                            <div key={idx} className="bg-gray-800 rounded-lg p-3 space-y-3">
                                                <div className="flex items-start gap-2">
                                                    <input
                                                        type="text"
                                                        value={cq.label}
                                                        onChange={(e) => updateCustomQuestion(idx, { label: e.target.value })}
                                                        placeholder={t('wizard_simple.question_label') || 'Question text...'}
                                                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCustomQuestion(idx)}
                                                        className="text-gray-500 hover:text-red-400 p-1"
                                                        title={t('common.remove') || 'Remove'}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Options - Individual Fields */}
                                                <div className="space-y-2">
                                                    <label className="text-xs text-gray-500 font-medium">
                                                        {t('wizard_simple.options') || 'Options'}
                                                    </label>
                                                    {cq.options.map((option, optIdx) => (
                                                        <div key={optIdx} className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={option}
                                                                onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                                                placeholder={`${t('wizard_simple.option') || 'Option'} ${optIdx + 1}`}
                                                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                                                            />
                                                            {cq.options.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeOption(idx, optIdx)}
                                                                    className="text-gray-500 hover:text-red-400 p-1"
                                                                    title={t('common.remove') || 'Remove'}
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => addOptionToQuestion(idx)}
                                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        {t('wizard_simple.add_option') || 'Add Option'}
                                                    </button>
                                                </div>

                                                {/* Allow Multiple Selections */}
                                                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={cq.allow_multiple || false}
                                                        onChange={(e) => updateCustomQuestion(idx, { allow_multiple: e.target.checked })}
                                                        className="w-4 h-4 accent-blue-500"
                                                    />
                                                    {t('wizard_simple.allow_multiple') || 'Allow multiple selections'}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Privacy Policy URL */}
                            <div className="border-t border-gray-700 pt-4">
                                <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">
                                    {t('wizard_simple.privacy_policy_url') || 'Privacy Policy URL'} <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="url"
                                    value={privacyPolicyUrl}
                                    onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                                    placeholder="https://yoursite.com/privacy"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('wizard_simple.privacy_policy_hint') || 'Required by Facebook for lead forms'}
                                </p>
                            </div>

                            {/* Thank You Page */}
                            <div className="border-t border-gray-700 pt-4">
                                <h4 className="text-sm font-semibold text-gray-300 mb-3">
                                    {t('wizard_simple.thank_you_page') || 'Thank You Page'} <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">
                                            {t('wizard_simple.thank_you_headline') || 'Headline'}
                                        </label>
                                        <input
                                            type="text"
                                            value={thankYouTitle}
                                            onChange={(e) => setThankYouTitle(e.target.value)}
                                            placeholder={t('wizard_simple.thank_you_headline_placeholder') || 'Thank you!'}
                                            maxLength={60}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                                        />
                                        <span className="text-xs text-gray-500">{thankYouTitle.length}/60</span>
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">
                                            {t('wizard_simple.thank_you_description') || 'Description'}
                                        </label>
                                        <textarea
                                            value={thankYouBody}
                                            onChange={(e) => setThankYouBody(e.target.value)}
                                            placeholder={t('wizard_simple.thank_you_description_placeholder') || "We'll be in touch soon..."}
                                            maxLength={160}
                                            rows={2}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:border-blue-500 outline-none resize-none"
                                        />
                                        <span className="text-xs text-gray-500">{thankYouBody.length}/160</span>
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">
                                            {t('wizard_simple.website_url') || 'Website URL'}
                                        </label>
                                        <input
                                            type="url"
                                            value={thankYouUrl}
                                            onChange={(e) => setThankYouUrl(e.target.value)}
                                            placeholder="https://yourwebsite.com"
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            {t('wizard_simple.thank_you_hint') || 'Users will see a "Go to website" button after submitting'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => { setShowFormBuilder(false); resetFormBuilder(); }}
                                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateForm}
                                disabled={isCreatingForm}
                                className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCreatingForm ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('wizard_simple.creating') || 'Creating...'}
                                    </>
                                ) : (
                                    t('wizard_simple.create_form') || 'Create Form'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post Picker Modal */}
            <PostPicker
                isOpen={showPostPicker}
                onClose={() => setShowPostPicker(false)}
                onSelect={handleSelectExistingPost}
                accountId={accountId}
                pageId={pageId}
                t={t}
            />
        </div>
    );
}
