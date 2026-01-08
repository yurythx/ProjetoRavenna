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
    const stats = [
        {
            icon: Eye,
            label: 'Visualizações',
            value: formatCompactNumber(viewCount),
            fullValue: formatFullNumber(viewCount),
            show: true,
        },
        {
            icon: Users,
            label: 'Visitantes únicos',
            value: formatCompactNumber(uniqueViews),
            fullValue: formatFullNumber(uniqueViews),
            show: variant === 'full',
        },
        {
            icon: Clock,
            label: 'Tempo de leitura',
            value: `${readingTime} min`,
            fullValue: `${readingTime} minutos`,
            show: true,
        },
        {
            icon: Heart,
            label: 'Curtidas',
            value: formatCompactNumber(likeCount),
            fullValue: formatFullNumber(likeCount),
            show: variant === 'full',
        },
        {
            icon: MessageCircle,
            label: 'Comentários',
            value: formatCompactNumber(commentCount),
            fullValue: formatFullNumber(commentCount),
            show: variant === 'full',
        },
        {
            icon: TrendingUp,
            label: 'Engajamento',
            value: `${engagementRate.toFixed(1).replace('.', ',')}%`,
            fullValue: `${engagementRate.toFixed(2).replace('.', ',')}% de taxa de engajamento`,
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
            aria-label="Estatísticas do artigo"
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
