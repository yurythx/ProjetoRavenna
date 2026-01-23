/**
 * ArticleStats Component
 * 
 * Displays comprehensive article statistics including:
 * - View count (total and unique)
 * - Reading time
 * - Engagement rate
 * - Like and comment counts
 * 
 * Used on article detail pages to show analytics metrics.
 */

import { Eye, Clock, TrendingUp, Heart, MessageCircle, Users } from 'lucide-react';
import { formatCompactNumber, formatFullNumber } from '@/lib/formatters';
import { useTranslations } from 'next-intl';

interface ArticleStatsProps {
    /**
     * Total view count
     */
    viewCount: number;

    /**
     * Unique visitor count
     */
    uniqueViews: number;

    /**
     * Estimated reading time in minutes
     */
    readingTime: number;

    /**
     * Engagement rate percentage
     */
    engagementRate: number;

    /**
     * Number of likes
     */
    likeCount: number;

    /**
     * Number of comments
     */
    commentCount: number;

    /**
     * Layout orientation
     * @default 'horizontal'
     */
    layout?: 'horizontal' | 'vertical' | 'grid';

    /**
     * Show all stats or compact view
     * @default 'full'
     */
    variant?: 'full' | 'compact';

    /**
     * Additional CSS classes
     */
    className?: string;
}

export default function ArticleStats({
    viewCount,
    uniqueViews,
    readingTime,
    engagementRate,
    likeCount,
    commentCount,
    layout = 'horizontal',
    variant = 'full',
    className = '',
}: ArticleStatsProps) {
    const t = useTranslations('ArticleStats');

    const stats = [
        {
            icon: Eye,
            label: t('views'),
            value: formatCompactNumber(viewCount),
            fullValue: formatFullNumber(viewCount),
            show: true,
        },
        {
            icon: Users,
            label: t('uniqueVisitors'),
            value: formatCompactNumber(uniqueViews),
            fullValue: formatFullNumber(uniqueViews),
            show: variant === 'full',
        },
        {
            icon: Clock,
            label: t('readingTime'),
            value: `${readingTime} min`,
            fullValue: `${readingTime} ${t('minutes')}`,
            show: true,
        },
        {
            icon: Heart,
            label: t('likes'),
            value: formatCompactNumber(likeCount),
            fullValue: formatFullNumber(likeCount),
            show: variant === 'full',
        },
        {
            icon: MessageCircle,
            label: t('comments'),
            value: formatCompactNumber(commentCount),
            fullValue: formatFullNumber(commentCount),
            show: variant === 'full',
        },
        {
            icon: TrendingUp,
            label: t('engagement'),
            value: `${engagementRate.toFixed(1).replace('.', ',')}%`,
            fullValue: t('engagementRate', { rate: engagementRate.toFixed(2).replace('.', ',') }),
            show: variant === 'full' && viewCount > 0,
        },
    ].filter(stat => stat.show);

    const layoutClasses = {
        horizontal: 'flex flex-wrap gap-4 items-center',
        vertical: 'flex flex-col gap-3',
        grid: 'grid grid-cols-2 md:grid-cols-3 gap-3',
    };

    return (
        <div
            className={`${layoutClasses[layout]} ${className}`}
            role="group"
            aria-label={t('ariaLabel')}
        >
            {stats.map((stat, index) => (
                <div
                    key={index}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
                    title={stat.fullValue}
                >
                    <stat.icon size={16} className="flex-shrink-0" />
                    <span className="text-sm font-medium">{stat.value}</span>
                    {variant === 'full' && layout !== 'horizontal' && (
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                            {stat.label}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
