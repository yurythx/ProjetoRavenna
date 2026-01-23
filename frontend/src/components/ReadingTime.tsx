/**
 * ReadingTime Component
 * 
 * Displays estimated reading time with clock icon.
 * Calculated based on average reading speed (200 words/min).
 */

import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ReadingTimeProps {
    /**
     * Reading time in minutes
     */
    minutes: number;

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
     * Show full text vs abbreviated
     * @default false
     */
    fullText?: boolean;
}

export default function ReadingTime({
    minutes,
    size = 'md',
    className = '',
    fullText = false,
}: ReadingTimeProps) {
    const t = useTranslations('ArticleDetail');
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

    const getText = () => {
        if (fullText) {
            return t('minutesOfReading', { minutes });
        }
        return `${minutes} ${t('minutes')}`;
    };

    return (
        <div
            className={`flex items-center text-gray-600 dark:text-gray-400 ${sizeClasses[size]} ${className}`}
            title={t('readingTimeTooltip', { minutes })}
        >
            <Clock size={iconSizes[size]} className="flex-shrink-0" />
            <span className="font-medium">{getText()}</span>
        </div>
    );
}
