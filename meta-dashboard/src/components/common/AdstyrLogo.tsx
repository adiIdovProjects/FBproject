import React from 'react';

interface AdstyrLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    variant?: 'light' | 'dark';
    className?: string;
}

const sizeMap = {
    sm: { icon: 24, text: 'text-base' },
    md: { icon: 32, text: 'text-lg' },
    lg: { icon: 40, text: 'text-xl' },
    xl: { icon: 56, text: 'text-3xl' },
};

const AdstyrLogo: React.FC<AdstyrLogoProps> = ({
    size = 'md',
    showText = true,
    variant = 'light',
    className = '',
}) => {
    const { icon, text } = sizeMap[size];
    const textColor = variant === 'light' ? 'text-white' : 'text-slate-900';

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Compass SVG */}
            <svg
                width={icon}
                height={icon}
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
            >
                {/* Gradient definitions */}
                <defs>
                    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                    <linearGradient id="needleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1E293B" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#1E293B" />
                    </linearGradient>
                </defs>

                {/* Outer ring */}
                <circle
                    cx="24"
                    cy="24"
                    r="21"
                    stroke="url(#ringGradient)"
                    strokeWidth="2.5"
                    fill="none"
                />

                {/* Cardinal markers */}
                <line x1="24" y1="5" x2="24" y2="9" stroke="url(#ringGradient)" strokeWidth="2" strokeLinecap="round" />
                <line x1="24" y1="39" x2="24" y2="43" stroke="url(#ringGradient)" strokeWidth="2" strokeLinecap="round" />
                <line x1="5" y1="24" x2="9" y2="24" stroke="url(#ringGradient)" strokeWidth="2" strokeLinecap="round" />
                <line x1="39" y1="24" x2="43" y2="24" stroke="url(#ringGradient)" strokeWidth="2" strokeLinecap="round" />

                {/* Compass needle - pointing up-right (growth direction) */}
                <path
                    d="M24 10 L30 24 L24 38 L18 24 Z"
                    fill="url(#needleGradient)"
                />

                {/* North half of needle (darker) */}
                <path
                    d="M24 10 L30 24 L24 24 L18 24 Z"
                    fill="#1E293B"
                />

                {/* South half of needle (violet accent) */}
                <path
                    d="M24 24 L30 24 L24 38 L18 24 Z"
                    fill="#8B5CF6"
                />

                {/* Center dot */}
                <circle cx="24" cy="24" r="3" fill="#6366F1" />
                <circle cx="24" cy="24" r="1.5" fill="white" />
            </svg>

            {/* Text */}
            {showText && (
                <span className={`font-extrabold tracking-tight ${text} ${textColor}`}>
                    Adstyr
                </span>
            )}
        </div>
    );
};

export default AdstyrLogo;
