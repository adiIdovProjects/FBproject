"use client";

import React from 'react';
import { QuickReplyOption } from './CaptainContext';

interface QuickRepliesProps {
    options: QuickReplyOption[];
    onSelect: (value: string) => void;
    disabled?: boolean;
}

export const QuickReplies: React.FC<QuickRepliesProps> = ({
    options,
    onSelect,
    disabled = false,
}) => {
    return (
        <div className="flex flex-wrap justify-center gap-3 mt-6">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => !disabled && onSelect(option.value)}
                    disabled={disabled}
                    className={`
                        px-5 py-3 rounded-xl font-medium text-base transition-all
                        ${disabled
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 hover:scale-105 active:scale-95 shadow-lg hover:shadow-amber-500/25'
                        }
                    `}
                >
                    {option.icon && <span className="mr-2">{option.icon}</span>}
                    {option.label}
                </button>
            ))}
        </div>
    );
};

// Flow selection cards for initial screen
interface FlowCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: 'blue' | 'purple' | 'orange';
    onClick: () => void;
}

export const FlowCard: React.FC<FlowCardProps> = ({
    title,
    description,
    icon,
    color,
    onClick,
}) => {
    const colorClasses = {
        blue: 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20',
        purple: 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/20',
        orange: 'border-orange-500 bg-orange-500/10 hover:bg-orange-500/20',
    };

    const iconColorClasses = {
        blue: 'bg-blue-500 text-white',
        purple: 'bg-purple-500 text-white',
        orange: 'bg-orange-500 text-white',
    };

    return (
        <button
            onClick={onClick}
            className={`
                p-6 rounded-2xl border-2 transition-all text-left w-full
                ${colorClasses[color]}
                hover:scale-[1.02] active:scale-[0.98]
            `}
        >
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full shrink-0 ${iconColorClasses[color]}`}>
                    {icon}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
                    <p className="text-gray-400 text-sm">{description}</p>
                </div>
            </div>
        </button>
    );
};
