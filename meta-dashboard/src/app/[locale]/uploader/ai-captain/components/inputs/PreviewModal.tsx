"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, ThumbsUp, MessageCircle, Share2, Bookmark, MoreHorizontal, Heart } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  headline: string;
  body: string;
  link?: string;
  cta?: string;
  pageName?: string;
  isRTL?: boolean;
}

type PreviewFormat = 'facebook' | 'instagram' | 'story';

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  previewUrl,
  headline,
  body,
  link,
  cta = 'Learn More',
  pageName = 'Your Page',
  isRTL = false,
}) => {
  const t = useTranslations();
  const [format, setFormat] = useState<PreviewFormat>('facebook');

  if (!isOpen) return null;

  const ctaText = {
    'LEARN_MORE': 'Learn More',
    'SHOP_NOW': 'Shop Now',
    'SIGN_UP': 'Sign Up',
    'CONTACT_US': 'Contact Us',
    'GET_OFFER': 'Get Offer',
    'BOOK_NOW': 'Book Now',
  }[cta] || cta;

  const domain = link ? new URL(link).hostname.replace('www.', '') : 'yoursite.com';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">
            {t('captain.preview')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format tabs */}
        <div className="flex border-b border-gray-800">
          {[
            { id: 'facebook', label: 'Facebook', icon: '📘' },
            { id: 'instagram', label: 'Instagram', icon: '📸' },
            { id: 'story', label: 'Story', icon: '📖' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFormat(tab.id as PreviewFormat)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                format === tab.id
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Preview content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {format === 'facebook' && (
            <div className="bg-white rounded-lg overflow-hidden text-gray-900">
              {/* Header */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {pageName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{pageName}</p>
                  <p className="text-xs text-gray-500">Sponsored · 🌐</p>
                </div>
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </div>

              {/* Body text */}
              <div className="px-3 pb-2">
                <p className="text-sm">{body || 'Your ad text will appear here...'}</p>
              </div>

              {/* Image */}
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Ad preview"
                  className="w-full aspect-square object-cover"
                />
              )}

              {/* Link preview */}
              <div className="bg-gray-100 p-3">
                <p className="text-xs text-gray-500 uppercase">{domain}</p>
                <p className="font-semibold text-sm mt-0.5">{headline || 'Your headline here'}</p>
              </div>

              {/* CTA button */}
              <div className="p-3 border-t">
                <button className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded text-sm">
                  {ctaText}
                </button>
              </div>

              {/* Engagement */}
              <div className="flex items-center justify-between px-3 py-2 border-t text-gray-500 text-sm">
                <button className="flex items-center gap-1.5 hover:text-blue-600">
                  <ThumbsUp className="w-4 h-4" /> Like
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-600">
                  <MessageCircle className="w-4 h-4" /> Comment
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-600">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </div>
          )}

          {format === 'instagram' && (
            <div className="bg-white rounded-lg overflow-hidden text-gray-900">
              {/* Header */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {pageName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{pageName.toLowerCase().replace(/\s+/g, '_')}</p>
                  <p className="text-xs text-gray-500">Sponsored</p>
                </div>
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </div>

              {/* Image */}
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Ad preview"
                  className="w-full aspect-square object-cover"
                />
              )}

              {/* Engagement icons */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-4">
                  <Heart className="w-6 h-6" />
                  <MessageCircle className="w-6 h-6" />
                  <Share2 className="w-6 h-6" />
                </div>
                <Bookmark className="w-6 h-6" />
              </div>

              {/* Caption */}
              <div className="px-3 pb-2">
                <p className="text-sm">
                  <span className="font-semibold">{pageName.toLowerCase().replace(/\s+/g, '_')}</span>{' '}
                  {headline || 'Your headline here'}
                </p>
                <p className="text-sm text-gray-600 mt-1">{body || 'Your ad text...'}</p>
              </div>

              {/* CTA */}
              <div className="mx-3 mb-3">
                <button className="w-full py-2 px-4 bg-blue-500 text-white font-medium rounded text-sm">
                  {ctaText}
                </button>
              </div>
            </div>
          )}

          {format === 'story' && (
            <div className="bg-gray-800 rounded-lg overflow-hidden relative" style={{ aspectRatio: '9/16', maxHeight: '400px' }}>
              {/* Background image */}
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Ad preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

              {/* Header */}
              <div className="absolute top-4 left-4 right-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  {pageName.charAt(0)}
                </div>
                <span className="text-white text-sm font-medium">{pageName}</span>
                <span className="text-white/60 text-xs">Sponsored</span>
              </div>

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-semibold text-lg mb-1">{headline || 'Your headline'}</p>
                <p className="text-white/80 text-sm mb-4 line-clamp-2">{body || 'Your ad text...'}</p>

                {/* Swipe up CTA */}
                <div className="flex items-center justify-center">
                  <div className="px-6 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                    ↑ {ctaText}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            {t('captain.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
