'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing modal accessibility features:
 * - Focus trap (Tab cycling within modal)
 * - Escape key to close
 * - Return focus to trigger element on close
 * - Body scroll lock
 *
 * WCAG 2.1.1 (Keyboard), 2.1.2 (No Keyboard Trap), 2.4.3 (Focus Order)
 */
export function useModalAccessibility(
  isOpen: boolean,
  onClose: () => void
) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element and focus the modal
  useEffect(() => {
    if (isOpen) {
      // Store current focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus first focusable element in modal
      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements && focusableElements.length > 0) {
        // Small delay to ensure modal is rendered
        setTimeout(() => {
          focusableElements[0].focus();
        }, 10);
      }

      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus to previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }

      // Restore body scroll
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle focus trap on Tab key
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift+Tab on first element -> go to last
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
    // Tab on last element -> go to first
    else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, []);

  return { modalRef, handleKeyDown };
}
