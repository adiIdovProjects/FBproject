"use client";

import { useState, useEffect } from 'react';
import { X, Loader2, Instagram, Facebook, Image as ImageIcon } from 'lucide-react';
import { mutationsService, PagePost } from '@/services/mutations.service';

interface PostPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (post: PagePost) => void;
    accountId: string;
    pageId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
}

type TabType = 'facebook' | 'instagram';

export default function PostPicker({ isOpen, onClose, onSelect, accountId, pageId, t }: PostPickerProps) {
    const [activeTab, setActiveTab] = useState<TabType>('facebook');
    const [facebookPosts, setFacebookPosts] = useState<PagePost[]>([]);
    const [instagramPosts, setInstagramPosts] = useState<PagePost[]>([]);
    const [isLoadingFb, setIsLoadingFb] = useState(false);
    const [isLoadingIg, setIsLoadingIg] = useState(false);
    const [igConnected, setIgConnected] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && accountId && pageId) {
            loadPosts();
        }
    }, [isOpen, accountId, pageId]);

    const loadPosts = async () => {
        setError(null);

        // Load Facebook posts
        setIsLoadingFb(true);
        try {
            const fbData = await mutationsService.getPagePosts(accountId, pageId, 20);
            setFacebookPosts(fbData.posts);
        } catch (err) {
            console.error('Failed to load Facebook posts:', err);
            setError('Failed to load Facebook posts');
        } finally {
            setIsLoadingFb(false);
        }

        // Load Instagram posts
        setIsLoadingIg(true);
        try {
            const igData = await mutationsService.getInstagramPosts(accountId, pageId, 20);
            setInstagramPosts(igData.posts);
            setIgConnected(igData.instagram_connected);
        } catch (err) {
            console.error('Failed to load Instagram posts:', err);
            setIgConnected(false);
        } finally {
            setIsLoadingIg(false);
        }
    };

    const handleSelectPost = (post: PagePost) => {
        onSelect(post);
        onClose();
    };

    if (!isOpen) return null;

    const currentPosts = activeTab === 'facebook' ? facebookPosts : instagramPosts;
    const isLoading = activeTab === 'facebook' ? isLoadingFb : isLoadingIg;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t?.postPicker?.title || 'Select Existing Post'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('facebook')}
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                            activeTab === 'facebook'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <Facebook className="w-5 h-5" />
                        Facebook
                        {facebookPosts.length > 0 && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                {facebookPosts.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('instagram')}
                        disabled={igConnected === false}
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                            activeTab === 'instagram'
                                ? 'text-pink-600 border-b-2 border-pink-600'
                                : igConnected === false
                                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <Instagram className="w-5 h-5" />
                        Instagram
                        {igConnected === false && (
                            <span className="text-xs text-gray-400">
                                ({t?.postPicker?.notConnected || 'Not connected'})
                            </span>
                        )}
                        {instagramPosts.length > 0 && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                {instagramPosts.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : currentPosts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>{t?.postPicker?.noPosts || 'No posts found'}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {currentPosts.map((post) => (
                                <button
                                    key={post.id}
                                    onClick={() => handleSelectPost(post)}
                                    className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition bg-gray-100 dark:bg-gray-700"
                                >
                                    {post.full_picture ? (
                                        <img
                                            src={post.full_picture}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-8 h-8 text-gray-400" />
                                        </div>
                                    )}
                                    {/* Overlay with message preview */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                                        <p className="text-white text-xs line-clamp-3">
                                            {post.message || '(No caption)'}
                                        </p>
                                    </div>
                                    {/* Type badge */}
                                    <div className="absolute top-2 left-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
                                            post.type === 'video' ? 'bg-purple-500' : 'bg-blue-500'
                                        }`}>
                                            {post.type}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                    {t?.postPicker?.hint || 'Using an existing post preserves likes, comments, and shares across all ads.'}
                </div>
            </div>
        </div>
    );
}
