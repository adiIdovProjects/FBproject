"use client";

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableHintProps {
  title: string;
  content: string;
  className?: string;
}

export const ExpandableHint: React.FC<ExpandableHintProps> = ({
  title,
  content,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-300 text-sm transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
        <span>{title}</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-2 p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300">
          {content}
        </div>
      )}
    </div>
  );
};

export default ExpandableHint;
