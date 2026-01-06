'use client';

import { Tag } from '@/hooks/useTags';
import { useRouter } from 'next/navigation';

interface TagBadgeProps {
    tag: Tag;
    size?: 'sm' | 'md' | 'lg';
    clickable?: boolean;
    showCount?: boolean;
}

export default function TagBadge({ tag, size = 'md', clickable = true, showCount = false }: TagBadgeProps) {
    const router = useRouter();
    const sizeClasses = {
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-3 py-1.5',
        lg: 'text-base px-4 py-2',
    };

    const badge = (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200 ${sizeClasses[size]}`}
            style={{
                backgroundColor: tag.color + '20', // 20% opacity
                color: tag.color,
                border: `1px solid ${tag.color}40`, // 40% opacity border
            }}
        >
            <span className="font-semibold">{tag.name}</span>
            {showCount && tag.article_count > 0 && (
                <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-bold`}
                    style={{
                        backgroundColor: tag.color,
                        color: '#fff',
                    }}
                >
                    {tag.article_count}
                </span>
            )}
        </span>
    );

    if (!clickable) {
        return badge;
    }

    return (
        <button
            type="button"
            className="inline-block transition-transform duration-200 hover:scale-105"
            title={tag.description || tag.name}
            onClick={(e) => {
                e.stopPropagation();
                router.push(`/tags/${tag.slug}`);
            }}
        >
            {badge}
        </button>
    );
}
