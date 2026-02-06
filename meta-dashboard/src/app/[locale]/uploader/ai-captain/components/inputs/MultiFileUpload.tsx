"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, X, Plus, Image as ImageIcon, Film } from 'lucide-react';

interface MultiFileUploadProps {
  files: File[];
  previews: string[];
  maxFiles?: number;
  onFilesChange: (files: File[], previews: string[]) => void;
  onContinue: () => void;
  isRTL?: boolean;
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  files,
  previews,
  maxFiles = 5,
  onFilesChange,
  onContinue,
  isRTL = false,
}) => {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Drop zone */}
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
      {files.length > 0 && (
        <button
          onClick={onContinue}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {t('captain.continue_with_x_creatives', { count: files.length })}
        </button>
      )}
    </div>
  );
};
