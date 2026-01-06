'use client';

import TagBadge from './TagBadge';
import { Tag } from '@/hooks/useTags';

interface TagCloudProps {
    tags: Tag[];
    maxTags?: number;
}

export default function TagCloud({ tags, maxTags = 20 }: TagCloudProps) {
    // Sort by article count and take top N
    const sortedTags = [...tags]
        .sort((a, b) => b.article_count - a.article_count)
        .slice(0, maxTags);

    // Calculate font size based on article count
    const maxCount = Math.max(...sortedTags.map((t) => t.article_count), 1);
    const minCount = Math.min(...sortedTags.map((t) => t.article_count), 0);

    const getSizeForTag = (tag: Tag): 'sm' | 'md' | 'lg' => {
        const normalizedCount = (tag.article_count - minCount) / (maxCount - minCount || 1);

        if (normalizedCount > 0.66) return 'lg';
        if (normalizedCount > 0.33) return 'md';
        return 'sm';
    };

    if (tags.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>Nenhuma tag disponível no momento.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-3 items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            {sortedTags.map((tag) => (
                <div
                    key={tag.id}
                    className="transition-all duration-200 hover:scale-110"
                >
                    <TagBadge
                        tag={tag}
                        size={getSizeForTag(tag)}
                        showCount={true}
                    />
                </div>
            ))}
        </div>
    );
}
