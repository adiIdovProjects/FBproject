"use client";

import React from 'react';
import { Card } from '@tremor/react';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  hint?: string;
  onClick: () => void;
  gradient: string;
}

const ActionCard: React.FC<ActionCardProps> = ({
  icon: Icon,
  title,
  description,
  hint,
  onClick,
  gradient,
}) => {
  return (
    <Card
      className="card-gradient border-border-subtle cursor-pointer hover:border-accent/30 transition-all duration-200 hover:scale-[1.02] group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Icon */}
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex flex-col min-w-0">
          <h3 className="text-white font-bold text-sm mb-0.5">{title}</h3>
          <p className="text-gray-400 text-xs leading-snug">{description}</p>
          {hint && (
            <span className="text-[11px] text-accent/80 bg-accent/10 px-2 py-0.5 rounded-full mt-1.5 w-fit">
              {hint}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ActionCard;
