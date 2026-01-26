"use client";

import React, { useEffect, useState } from 'react';

interface SpeechBubbleProps {
    children: React.ReactNode;
    isTyping?: boolean;
    className?: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
    children,
    isTyping = false,
    className = '',
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const [showContent, setShowContent] = useState(false);

    // Simple typing effect for text content
    useEffect(() => {
        if (typeof children === 'string' && isTyping) {
            setDisplayedText('');
            setShowContent(false);
            let index = 0;
            const text = children;
            const interval = setInterval(() => {
                if (index < text.length) {
                    setDisplayedText(text.slice(0, index + 1));
                    index++;
                } else {
                    clearInterval(interval);
                    setShowContent(true);
                }
            }, 20);
            return () => clearInterval(interval);
        } else {
            setShowContent(true);
        }
    }, [children, isTyping]);

    return (
        <div className={`relative ${className}`}>
            {/* Speech bubble */}
            <div className="bg-white rounded-2xl px-6 py-4 shadow-xl max-w-lg mx-auto">
                {/* Tail pointing up to captain */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2
                              w-0 h-0 border-l-[12px] border-r-[12px] border-b-[12px]
                              border-l-transparent border-r-transparent border-b-white" />

                <div className="text-gray-900 text-lg leading-relaxed">
                    {typeof children === 'string' && isTyping ? (
                        <>
                            {displayedText}
                            {!showContent && <span className="animate-pulse">|</span>}
                        </>
                    ) : (
                        children
                    )}
                </div>
            </div>
        </div>
    );
};

// Typing indicator component
export const TypingIndicator: React.FC = () => {
    return (
        <div className="flex items-center gap-1 px-4 py-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    );
};
