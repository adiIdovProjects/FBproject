'use client';

import React, { useState } from 'react';
import { X, Loader2, Star, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { submitFeedback, FeedbackSubmission } from '../../services/feedback.service';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'bug' | 'feature_request' | 'improvement' | 'other';

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const t = useTranslations('feedback');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('improvement');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { modalRef, handleKeyDown } = useModalAccessibility(isOpen, onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError(t('error_required'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data: FeedbackSubmission = {
        feedback_type: feedbackType,
        title: title.trim(),
        message: message.trim(),
        ...(rating && { rating })
      };

      await submitFeedback(data);
      setSuccess(true);

      // Reset form and close after delay
      setTimeout(() => {
        setTitle('');
        setMessage('');
        setRating(null);
        setFeedbackType('improvement');
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('[FeedbackModal] Error:', err);
      setError(t('error_submit'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setTitle('');
      setMessage('');
      setRating(null);
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-lg mx-auto card-gradient rounded-2xl border border-border-subtle shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-accent" aria-hidden="true" />
            <div>
              <h2 id="feedback-modal-title" className="text-xl font-bold text-white">{t('title')}</h2>
              <p className="text-sm text-gray-400">{t('subtitle')}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            aria-label={t('cancel') || 'Close'}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-400" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('success_title')}</h3>
            <p className="text-gray-400">{t('success_message')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('type_label')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['bug', 'feature_request', 'improvement', 'other'] as FeedbackType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFeedbackType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      feedbackType === type
                        ? 'bg-accent text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {t(`type_${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('title_label')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('title_placeholder')}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                maxLength={255}
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('message_label')}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('message_placeholder')}
                rows={4}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('rating_label')}
              </label>
              <div className="flex gap-1" role="group" aria-label={t('rating_label')}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? null : star)}
                    aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                    aria-pressed={rating === star}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        rating && star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-500'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading || !title.trim() || !message.trim()}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  t('submit')
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default FeedbackModal;
