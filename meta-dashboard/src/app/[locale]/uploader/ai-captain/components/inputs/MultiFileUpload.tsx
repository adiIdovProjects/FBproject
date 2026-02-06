"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, X, Plus, Image as ImageIcon, Film, FileText, AlertTriangle, Link, MousePointer } from 'lucide-react';
import PostPicker from '../../../wizard/components/PostPicker';
import { PagePost } from '@/services/mutations.service';

interface ExistingPostData {
  objectStoryId: string;
  preview?: {
    thumbnail?: string;
    message?: string;
    source?: 'facebook' | 'instagram';
  };
}

interface MultiFileUploadProps {
  files: File[];
  previews: string[];
  maxFiles?: number;
  onFilesChange: (files: File[], previews: string[]) => void;
  onContinue: () => void;
  isRTL?: boolean;
  // For existing post selection
  accountId?: string;
  pageId?: string;
  onSelectExistingPost?: (data: ExistingPostData) => void;
  existingPost?: ExistingPostData | null;
  onClearExistingPost?: () => void;
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  files,
  previews,
  maxFiles = 5,
  onFilesChange,
  onContinue,
  isRTL = false,
  accountId,
  pageId,
  onSelectExistingPost,
  existingPost,
  onClearExistingPost,
}) => {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPostPicker, setShowPostPicker] = useState(false);

  const handleSelectPost = (post: PagePost) => {
    if (onSelectExistingPost) {
      onSelectExistingPost({
        objectStoryId: post.source === 'instagram' && post.ig_account_id
          ? `${post.ig_account_id}_${post.id}`
          : `${pageId}_${post.id}`,
        preview: {
          thumbnail: post.full_picture,
          message: post.message,
          source: post.source,
        },
      });
    }
    setShowPostPicker(false);
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    // Filter valid files (images and videos)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    ];

    fileArray.forEach(file => {
      if (allowedTypes.includes(file.type) && files.length + validFiles.length < maxFiles) {
        validFiles.push(file);
      }
    });

    // Create previews for new files
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      newPreviews.push(url);
    });

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles], [...previews, ...newPreviews]);
    }
  }, [files, previews, maxFiles, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFiles]);

  const handleRemove = useCallback((index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(previews[index]);

    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    onFilesChange(newFiles, newPreviews);
  }, [files, previews, onFilesChange]);

  const isVideo = (file: File) => file.type.startsWith('video/');

  // Check if we can show existing post option
  const canUseExistingPost = accountId && pageId && onSelectExistingPost;

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Existing post selected */}
      {existingPost && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            {existingPost.preview?.thumbnail ? (
              <img
                src={existingPost.preview.thumbnail}
                alt="Post preview"
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-700 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  existingPost.preview?.source === 'instagram'
                    ? 'bg-pink-500/20 text-pink-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {existingPost.preview?.source === 'instagram' ? 'Instagram' : 'Facebook'}
                </span>
                <span className="text-xs text-green-400">{t('captain.existing_post_selected')}</span>
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">
                {existingPost.preview?.message || t('captain.no_caption')}
              </p>
            </div>
            <button
              onClick={onClearExistingPost}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
              title={t('captain.choose_different_post')}
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Warning: Content cannot be edited */}
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-amber-400 font-medium">{t('captain.existing_post_content_locked')}</p>
                <p className="text-gray-400 text-xs mt-0.5">{t('captain.existing_post_content_locked_hint')}</p>
              </div>
            </div>
          </div>

          {/* What you can customize */}
          <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm font-medium mb-1.5">{t('captain.existing_post_you_can_customize')}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-300 text-xs">
                <Link className="w-3 h-3 text-green-400" />
                <span>{t('captain.existing_post_link_hint')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-xs">
                <MousePointer className="w-3 h-3 text-green-400" />
                <span>{t('captain.existing_post_cta_hint')}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowPostPicker(true)}
              className="flex-1 py-2.5 px-4 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-xl transition-all duration-200"
            >
              {t('captain.choose_different_post')}
            </button>
            <button
              onClick={onContinue}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all duration-200"
            >
              {t('captain.continue_with_existing_post')}
            </button>
          </div>
        </div>
      )}

      {/* Drop zone - hidden if existing post selected */}
      {!existingPost && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragging
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
            }
            ${files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
            multiple
            onChange={handleInputChange}
            className="hidden"
            disabled={files.length >= maxFiles}
          />

          <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-300 font-medium">
            {t('captain.upload_creatives')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('captain.drag_drop_or_click')}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {files.length}/{maxFiles} {t('captain.files_uploaded')}
          </p>
        </div>
      )}

      {/* Thumbnails */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {files.map((file, index) => (
            <div
              key={index}
              className="relative group"
            >
              <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-700 bg-gray-800">
                {isVideo(file) ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <Film className="w-8 h-8 text-gray-400" />
                  </div>
                ) : (
                  <img
                    src={previews[index]}
                    alt={`Creative ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              {/* Index badge */}
              <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>

              {/* Video badge */}
              {isVideo(file) && (
                <div className="absolute bottom-1 right-1 bg-purple-500/80 text-white text-xs px-1.5 py-0.5 rounded">
                  Video
                </div>
              )}
            </div>
          ))}

          {/* Add more button */}
          {files.length < maxFiles && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-600 hover:border-gray-500 flex flex-col items-center justify-center text-gray-500 hover:text-gray-400 transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs mt-1">{t('captain.add_more')}</span>
            </button>
          )}
        </div>
      )}

      {/* Continue button */}
      {files.length > 0 && !existingPost && (
        <button
          onClick={onContinue}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {t('captain.continue_with_x_creatives', { count: files.length })}
        </button>
      )}

      {/* Or use existing post option */}
      {canUseExistingPost && !existingPost && files.length === 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-gray-900 text-gray-500">{t('captain.or')}</span>
          </div>
        </div>
      )}

      {canUseExistingPost && !existingPost && files.length === 0 && (
        <button
          onClick={() => setShowPostPicker(true)}
          className="w-full py-3 px-4 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          <FileText className="w-5 h-5" />
          {t('captain.use_existing_post')}
        </button>
      )}

      {/* Post Picker Modal */}
      {canUseExistingPost && (
        <PostPicker
          isOpen={showPostPicker}
          onClose={() => setShowPostPicker(false)}
          onSelect={handleSelectPost}
          accountId={accountId}
          pageId={pageId}
          t={{
            postPicker: {
              title: t('captain.select_existing_post'),
              noPosts: t('captain.no_posts_found'),
              notConnected: t('captain.instagram_not_connected'),
              hint: t('captain.existing_post_hint'),
            }
          }}
        />
      )}
    </div>
  );
};
