'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipIconProps {
  content: string;
  className?: string;
}

export function TooltipIcon({ content, className = '' }: TooltipIconProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={`text-gray-400 hover:text-purple-400 transition-colors ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isVisible && (
        <div
          className="absolute z-50 w-64 px-3 py-2 text-sm text-white bg-gray-900 border border-gray-700 rounded-lg shadow-xl -top-2 left-6"
          role="tooltip"
        >
          {content}
          {/* Arrow pointing to icon */}
          <div className="absolute w-2 h-2 bg-gray-900 border-l border-b border-gray-700 transform rotate-45 -left-1 top-3"></div>
        </div>
      )}
    </div>
  );
}
