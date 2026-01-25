'use client';

import React from 'react';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ title, lastUpdated, children }) => {
  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#101622] py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-sm border border-slate-200 dark:border-[#232f48] p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 dark:text-white">{title}</h1>
          <p className="text-slate-500 text-sm mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-slate dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed
            prose-li:text-slate-600 dark:prose-li:text-slate-300
            prose-a:text-[#135bec] prose-a:no-underline hover:prose-a:underline
            prose-strong:text-slate-900 dark:prose-strong:text-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPageLayout;
