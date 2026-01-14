"use client";

/**
 * InsightsSummary Component
 * TL;DR summary bullets at the bottom of Overview tab
 */

interface InsightsSummaryProps {
  bullets: string[];
  isRTL: boolean;
  title?: string;
}

export default function InsightsSummary({ bullets, isRTL, title }: InsightsSummaryProps) {
  if (!bullets || bullets.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-xl p-5 mt-6">
      <h3 className={`font-semibold text-purple-200 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
        {title || 'Summary'}
      </h3>

      <ul className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
        {bullets.map((bullet, index) => (
          <li
            key={index}
            className="text-gray-300 text-sm leading-relaxed"
          >
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}
