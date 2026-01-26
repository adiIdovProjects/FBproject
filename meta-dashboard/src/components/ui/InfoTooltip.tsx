/**
 * InfoTooltip Component
 * Custom styled tooltip for metric explanations
 * Uses fixed positioning to escape overflow:hidden containers
 */

'use client';

import React, { useState, useRef } from 'react';
import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface InfoTooltipProps {
  tooltipKey: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  tooltipKey,
  size = 'sm',
  className = '',
}) => {
  const t = useTranslations();
  const tooltipText = t(tooltipKey);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8, // Position above the icon
        left: rect.left + rect.width / 2, // Center horizontally
      });
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={iconRef}
        className={`inline-flex items-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Info
          className={`${iconSize} text-text-muted hover:text-foreground cursor-help transition-colors`}
        />
      </div>
      {isVisible && (
        <div
          className="fixed z-[9999] px-3 py-2 bg-card text-foreground text-xs rounded-lg shadow-2xl border border-border-subtle max-w-xs pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span className="whitespace-normal">{tooltipText}</span>
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: '100%' }}
          >
            <div className="border-[6px] border-transparent border-t-card -mt-px"></div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfoTooltip;
