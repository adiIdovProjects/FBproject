'use client';

import { useEffect, RefObject } from 'react';

/**
 * Hook to detect clicks outside of a referenced element.
 * Useful for closing dropdowns, popovers, and modals.
 *
 * @param ref - React ref to the element to monitor
 * @param handler - Callback function when click outside is detected
 * @param enabled - Optional flag to enable/disable the listener (default: true)
 *
 * @example
 * const popoverRef = useRef<HTMLDivElement>(null);
 * useClickOutside(popoverRef, () => setIsOpen(false), isOpen);
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, handler, enabled]);
}
