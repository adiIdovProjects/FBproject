"use client";

/**
 * TemplateButtons Component
 * Pre-built report template quick-select buttons
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, CalendarRange, Target, Layers, Layout, Users, Globe } from 'lucide-react';
import { ReportBreakdown, REPORT_TEMPLATES, ReportTemplateId } from '../../services/reports.service';

interface TemplateButtonsProps {
  selectedTemplate: ReportTemplateId | null;
  onSelectTemplate: (templateId: ReportTemplateId, primary: ReportBreakdown, secondary: ReportBreakdown) => void;
  isRTL?: boolean;
}

const ICONS: Record<string, React.ReactNode> = {
  'calendar': <Calendar className="w-4 h-4" />,
  'calendar-range': <CalendarRange className="w-4 h-4" />,
  'target': <Target className="w-4 h-4" />,
  'layers': <Layers className="w-4 h-4" />,
  'layout': <Layout className="w-4 h-4" />,
  'users': <Users className="w-4 h-4" />,
  'globe': <Globe className="w-4 h-4" />,
};

export const TemplateButtons: React.FC<TemplateButtonsProps> = ({
  selectedTemplate,
  onSelectTemplate,
  isRTL = false,
}) => {
  const t = useTranslations();

  return (
    <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      {REPORT_TEMPLATES.map((template) => {
        const isSelected = selectedTemplate === template.id;
        return (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.id, template.primaryBreakdown, template.secondaryBreakdown)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-200 border
              ${isSelected
                ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20'
              }
            `}
          >
            {ICONS[template.icon]}
            <span>{t(template.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TemplateButtons;
