
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, CheckCircle, Upload, Loader2
} from 'lucide-react';
import { mutationsService } from '../../../../services/mutations.service';
import { useAccount } from '../../../../context/AccountContext';

export default function AddCreativePage() {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    const { selectedAccountId, linkedAccounts, isLoading: isAccountLoading } = useAccount();
    const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);

    // Data Loading State
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [adSets, setAdSets] = useState<any[]>([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
    const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);

    // Form State
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    const [selectedAdSetId, setSelectedAdSetId] = useState<string>('');

    const [creative, setCreative] = useState({
        title: '',
        body: '',
        cta: 'LEARN_MORE',
        link: '',
        file: null as File | null,
        previewUrl: null as string | null
    });

    // Destination & Forms
    const [destinationType, setDestinationType] = useState<'WEBSITE' | 'LEAD_FORM'>('WEBSITE');
    const [leadForms, setLeadForms] = useState<any[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [isLoadingForms, setIsLoadingForms] = useState(false);

    // Custom Ad Name
    const [adName, setAdName] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Campaigns when Account changes
    useEffect(() => {
        if (selectedAccountId) {
            loadCampaigns(selectedAccountId);
        }
    }, [selectedAccountId]);

    // Fetch AdSets when Campaign changes
    useEffect(() => {
        if (selectedCampaignId) {
            loadAdSets(selectedCampaignId);
        } else {
            setAdSets([]);
            setSelectedAdSetId('');
        }
    }, [selectedCampaignId]);

    const loadCampaigns = async (accId: string) => {
        setIsLoadingCampaigns(true);
        try {
            const data = await mutationsService.getCampaignsList(accId);
            setCampaigns(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingCampaigns(false);
        }
    };

    const loadLeadForms = async (pageId: string, accountId: string) => {
        setIsLoadingForms(true);
        try {
            const forms = await mutationsService.getLeadForms(pageId, accountId);
            setLeadForms(forms);
        } catch (e: any) {
            console.error("Failed to load lead forms", e);
            // Don't set a page-level error - lead forms are optional
            // Just leave the forms list empty
            setLeadForms([]);
        } finally {
            setIsLoadingForms(false);
        }
    };

    // Load lead forms only when user selects "Instant Form" destination
    useEffect(() => {
        if (destinationType === 'LEAD_FORM' && selectedAccount?.page_id && selectedAccount?.account_id && leadForms.length === 0 && !isLoadingForms) {
            loadLeadForms(selectedAccount.page_id, selectedAccount.account_id);
        }
    }, [destinationType, selectedAccount?.page_id, selectedAccount?.account_id]);

    const loadAdSets = async (campId: string) => {
        setIsLoadingAdSets(true);
        try {
            const data = await mutationsService.getAdSetsList(campId);
            setAdSets(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingAdSets(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCreative(prev => ({
                ...prev,
                file: file,
                previewUrl: URL.createObjectURL(file)
            }));
        }
    };

    const handleSubmit = async () => {
        if (!selectedAccountId || !selectedCampaignId || !selectedAdSetId) {
            setError("Please select a campaign and ad set");
            return;
        }

        // Frontend Validation
        if (!creative.file) {
            setError("Please upload an image or video");
            return;
        }

        if (!creative.title || creative.title.trim().length === 0) {
            setError("Please enter a headline");
            return;
        }

        if (!creative.body || creative.body.trim().length === 0) {
            setError("Please enter primary text");
            return;
        }

        // File size validation
        const maxImageSize = 30 * 1024 * 1024; // 30MB
        const maxVideoSize = 4 * 1024 * 1024 * 1024; // 4GB
        const isVideo = creative.file.type.startsWith('video/');

        if (!isVideo && creative.file.size > maxImageSize) {
            setError("Image must be under 30MB");
            return;
        }

        if (isVideo && creative.file.size > maxVideoSize) {
            setError("Video must be under 4GB");
            return;
        }

        // File format validation
        const validImageFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        const validVideoFormats = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

        if (!isVideo && !validImageFormats.includes(creative.file.type)) {
            setError("Image must be JPG, PNG, or GIF format");
            return;
        }

        if (isVideo && !validVideoFormats.includes(creative.file.type)) {
            setError("Video must be MP4 or MOV format");
            return;
        }

        // Destination validation
        if (destinationType === 'WEBSITE') {
            if (!creative.link) {
                setError("Please enter a website URL");
                return;
            }
            try {
                const url = new URL(creative.link);
                if (url.protocol !== 'https:' && url.protocol !== 'http:') {
                    setError("Website URL must start with http:// or https://");
                    return;
                }
            } catch (e) {
                setError("Please enter a valid website URL");
                return;
            }
        } else {
            if (!selectedFormId) {
                setError("Please select an Instant Form");
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Upload Media
            let imageHash = undefined;
            let videoId = undefined;

            if (creative.file) {
                const uploadRes = await mutationsService.uploadMedia(
                    selectedAccountId,
                    creative.file,
                    isVideo
                );
                if (isVideo) videoId = uploadRes.video_id;
                else imageHash = uploadRes.image_hash;
            }

            // 2. Add Creative Mutation
            if (!selectedAccount?.page_id) {
                setError("No Facebook Page connected to this account. Please connect a page first.");
                return;
            }

            const payload = {
                account_id: selectedAccountId,
                page_id: selectedAccount.page_id,  // Use dynamic page ID from account
                campaign_id: selectedCampaignId,
                adset_id: selectedAdSetId,
                creative: {
                    title: creative.title,
                    body: creative.body,
                    call_to_action: creative.cta,
                    link_url: destinationType === 'WEBSITE' ? creative.link : undefined,
                    lead_form_id: destinationType === 'LEAD_FORM' ? selectedFormId : undefined,
                    image_hash: imageHash,
                    video_id: videoId
                },
                ad_name: adName || undefined
            };

            const result = await mutationsService.addCreativeToAdSet(payload);

            console.log('Creative added successfully:', result);

            // Optional: Add success toast
            // toast.success(`Creative added! Ad ID: ${result.ad_id}`);

            router.push('/campaigns');

        } catch (err: any) {
            console.error(err);
            setError(parseFbError(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Parse Facebook API errors to user-friendly messages
    const parseFbError = (err: any): string => {
        const msg = err.response?.data?.detail || err.message || '';

        const errorMap: { [key: string]: string } = {
            'Permission denied': "Your Facebook account doesn't have permission to create ads. Please reconnect.",
            'Invalid access token': "Your Facebook session has expired. Please log in again.",
            'Invalid creative': "There's an issue with your image or video. Please try a different file.",
            'Invalid page': "The selected Facebook page is invalid or you don't have access to it.",
            'User request limit reached': "Too many requests. Please wait a moment and try again.",
        };

        for (const [pattern, friendlyMsg] of Object.entries(errorMap)) {
            if (msg.toLowerCase().includes(pattern.toLowerCase())) {
                return friendlyMsg;
            }
        }

        return "Failed to add creative. Please try again or contact support.";
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push(`/${locale}/uploader`)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Uploader
                    </button>
                </div>

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold">Add Creative to Existing Campaign</h1>
                </div>

                {/* Page ID Warning - only show after accounts have loaded */}
                {!isAccountLoading && selectedAccount && !selectedAccount.page_id && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">⚠️</div>
                            <div>
                                <h3 className="text-yellow-400 font-semibold mb-2">Facebook Page Not Connected</h3>
                                <p className="text-sm text-gray-300 mb-3">
                                    Your account needs to be reconnected to fetch your Facebook Page information.
                                </p>
                                <button
                                    onClick={() => router.push(`/${locale}/settings?tab=accounts`)}
                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-medium text-sm transition-colors"
                                >
                                    Go to Settings → Reconnect Account
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Selection Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Select Campaign</label>
                        <select
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-blue-500"
                            disabled={isLoadingCampaigns}
                        >
                            <option value="">-- Select Campaign --</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.status})
                                </option>
                            ))}
                        </select>
                        {isLoadingCampaigns && <p className="text-xs text-blue-400 animate-pulse">Loading campaigns...</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Select Ad Set</label>
                        <select
                            value={selectedAdSetId}
                            onChange={(e) => setSelectedAdSetId(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-blue-500"
                            disabled={!selectedCampaignId || isLoadingAdSets}
                        >
                            <option value="">-- Select Ad Set --</option>
                            {adSets.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        {isLoadingAdSets && <p className="text-xs text-blue-400 animate-pulse">Loading ad sets...</p>}
                    </div>
                </div>

                {/* Creative Form (Similar to Wizard Step 3) */}
                {selectedAdSetId && (
                    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Upload className="w-5 h-5 text-blue-400" />
                            New Ad Details
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left: Inputs */}
                            <div className="space-y-4">
                                {/* Ad Name (Optional) - Above file upload */}
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Ad Name (Optional)</label>
                                    <input
                                        placeholder="Leave blank for auto-generated name"
                                        value={adName}
                                        onChange={(e) => setAdName(e.target.value)}
                                        className="w-full bg-black border border-gray-700 rounded-lg p-3"
                                    />
                                </div>

                                {/* File */}
                                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-blue-500 relative">
                                    <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    {creative.file ? (
                                        <p className="text-green-400 font-medium">{creative.file.name}</p>
                                    ) : (
                                        <p className="text-gray-400 text-sm">Upload Image or Video</p>
                                    )}
                                </div>

                                <input
                                    placeholder="Headline"
                                    value={creative.title}
                                    onChange={(e) => setCreative({ ...creative, title: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded-lg p-3"
                                />
                                <textarea
                                    placeholder="Primary Text"
                                    value={creative.body}
                                    onChange={(e) => setCreative({ ...creative, body: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded-lg p-3 h-24 resize-none"
                                />

                                {/* Destination Selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Destination</label>
                                    <div className="flex gap-4 mb-2">
                                        <button
                                            onClick={() => setDestinationType('WEBSITE')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${destinationType === 'WEBSITE'
                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                                }`}
                                        >
                                            Website URL
                                        </button>
                                        <button
                                            onClick={() => setDestinationType('LEAD_FORM')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${destinationType === 'LEAD_FORM'
                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                                }`}
                                        >
                                            Instant Form
                                        </button>
                                    </div>

                                    {destinationType === 'WEBSITE' ? (
                                        <input
                                            placeholder="Website URL (https://...)"
                                            value={creative.link}
                                            onChange={(e) => setCreative({ ...creative, link: e.target.value })}
                                            className="w-full bg-black border border-gray-700 rounded-lg p-3"
                                        />
                                    ) : (
                                        <div className="space-y-1">
                                            <select
                                                value={selectedFormId}
                                                onChange={(e) => setSelectedFormId(e.target.value)}
                                                className="w-full bg-black border border-gray-700 rounded-lg p-3"
                                                disabled={isLoadingForms}
                                            >
                                                <option value="">-- Select Instant Form --</option>
                                                {leadForms.map(f => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.name} ({f.status || 'Active'})
                                                    </option>
                                                ))}
                                            </select>
                                            {isLoadingForms && <p className="text-xs text-blue-400 animate-pulse">Loading forms...</p>}
                                            {leadForms.length === 0 && !isLoadingForms && (
                                                <p className="text-xs text-yellow-500">No active lead forms found for this page.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <select
                                    value={creative.cta}
                                    onChange={(e) => setCreative({ ...creative, cta: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded-lg p-3"
                                >
                                    <option value="LEARN_MORE">Learn More</option>
                                    <option value="SHOP_NOW">Shop Now</option>
                                    <option value="SIGN_UP">Sign Up</option>
                                </select>
                            </div>

                            {/* Right: Preview */}
                            <div className="bg-white rounded-lg overflow-hidden h-fit text-black shadow-lg">
                                <div className="bg-gray-100 p-2 text-xs font-bold text-gray-500 border-b">Facebook Feed Preview</div>
                                <div className="p-3">
                                    <p className="text-sm mb-2">{creative.body || "Primary text..."}</p>
                                    <div className="bg-gray-200 aspect-video w-full flex items-center justify-center mb-2">
                                        {creative.previewUrl ? (
                                            creative.file?.type.startsWith('video') ? (
                                                <video src={creative.previewUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={creative.previewUrl} className="w-full h-full object-cover" />
                                            )
                                        ) : "Media"}
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                                        <div className="overflow-hidden">
                                            <p className="text-xs text-gray-500 uppercase">WEBSITE.COM</p>
                                            <p className="font-bold truncate">{creative.title || "Headline"}</p>
                                        </div>
                                        <button className="bg-gray-300 px-3 py-1 rounded text-xs font-bold">
                                            {creative.cta.replace('_', ' ')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-800">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !creative.file || !creative.title}
                                className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                                Publish Creative
                            </button>
                        </div>
                        {error && <p className="text-red-400 text-center">{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
