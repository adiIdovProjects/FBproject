import React from 'react';
import { Lightbulb, CheckCircle, AlertTriangle } from 'lucide-react';

interface TipProps {
    children: React.ReactNode;
    variant?: 'info' | 'success' | 'warning';
    className?: string;
}

const variantStyles = {
    info: {
        container: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
        icon: 'text-blue-400',
        Icon: Lightbulb
    },
    success: {
        container: 'bg-green-500/10 border-green-500/20 text-green-300',
        icon: 'text-green-400',
        Icon: CheckCircle
    },
    warning: {
        container: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
        icon: 'text-amber-400',
        Icon: AlertTriangle
    }
};

export const Tip: React.FC<TipProps> = ({ children, variant = 'info', className = '' }) => {
    const styles = variantStyles[variant];
    const Icon = styles.Icon;

    return (
        <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${styles.container} ${className}`}>
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${styles.icon}`} />
            <span>{children}</span>
        </div>
    );
};

export default Tip;
