/**
 * ViewCounter Component
 * 
 * Displays article view count with eye icon.
 * Formats large numbers (1K, 10K, 1M) for readability.
 */

import { Eye } from 'lucide-react';
import { formatCompactNumber } from '@/lib/formatters';

interface ViewCounterProps {
    /**
     * View count number
     */
    count: number;

    /**
     * Size variant
     * @default 'md'
     */
    size?: 'sm' | 'md' | 'lg';

    /**
     * Additional CSS classes
     */
    className?: string;

    /**
     * Show label text
     * @default false
     */
    showLabel?: boolean;
}

export default function ViewCounter({
    count,
    size = 'md',
    className = '',
    showLabel = false,
}: ViewCounterProps) {
    const sizeClasses = {
        sm: 'text-xs gap-1',
        md: 'text-sm gap-1.5',
        lg: 'text-base gap-2',
    };

    const iconSizes = {
        sm: 14,
        md: 16,
        lg: 18,
    };

    return (
        <div
            className={`flex items-center text-gray-600 dark:text-gray-400 ${sizeClasses[size]} ${className}`}
            title={`${count.toLocaleString('pt-BR')} visualizações`}
        >
            <Eye size={iconSizes[size]} className="flex-shrink-0" />
            <span className="font-medium">
                {formatCompactNumber(count)}
                {showLabel && <span className="ml-1 font-normal">visualizações</span>}
            </span>
        </div>
    );
}
