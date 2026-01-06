/**
 * ViewCounter Component
 * 
 * Displays article view count with eye icon.
 * Formats large numbers (1K, 10K, 1M) for readability.
 */

import { Eye } from 'lucide-react';

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

/**
 * Format large numbers to readable strings
 * 1234 -> "1.2K"
 * 1234567 -> "1.2M"
 */
const formatCount = (num: number): string => {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
};

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
            title={`${count.toLocaleString()} visualizações`}
        >
            <Eye size={iconSizes[size]} className="flex-shrink-0" />
            <span className="font-medium">
                {formatCount(count)}
                {showLabel && <span className="ml-1 font-normal">visualizações</span>}
            </span>
        </div>
    );
}
