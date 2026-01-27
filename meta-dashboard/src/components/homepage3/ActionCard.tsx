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
      <div className="flex flex-col items-center text-center p-4">
        {/* Large Icon */}
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-lg mb-2">{title}</h3>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-3">{description}</p>

        {/* Hint (optional) */}
        {hint && (
          <span className="text-xs text-accent/80 bg-accent/10 px-3 py-1 rounded-full">
            {hint}
          </span>
        )}
      </div>
    </Card>
  );
};

export default ActionCard;
