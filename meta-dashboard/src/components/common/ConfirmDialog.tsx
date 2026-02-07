"use client";

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
}) => {
  const { modalRef, handleKeyDown } = useModalAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'bg-red-500/20 text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: 'bg-amber-500/20 text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: 'bg-blue-500/20 text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Backdrop - click to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onKeyDown={handleKeyDown}
        className="bg-gray-900 rounded-xl w-full max-w-md shadow-2xl border border-gray-800 relative"
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${styles.icon}`}>
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400 text-sm">{message}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${styles.button}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
