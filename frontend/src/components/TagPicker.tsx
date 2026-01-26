'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTags, Tag } from '@/hooks/useTags';
import TagBadge from './TagBadge';

interface TagPickerProps {
    selectedTags: Tag[];
    onChange: (tags: Tag[]) => void;
    maxTags?: number;
}

import { useTranslations } from 'next-intl';

export default function TagPicker({ selectedTags, onChange, maxTags = 10 }: TagPickerProps) {
    const t = useTranslations('TagPicker');
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const { data: allTags = [], isLoading } = useTags(searchQuery);

    // Filter out already selected tags
    const availableTags = allTags.filter(
        (tag) => !selectedTags.some((selected) => selected.id === tag.id)
    );

    const handleAddTag = (tag: Tag) => {
        if (selectedTags.length >= maxTags) {
            return;
        }
        onChange([...selectedTags, tag]);
        setSearchQuery('');
        setIsOpen(false);
    };

    const handleRemoveTag = (tagId: string) => {
        onChange(selectedTags.filter((tag) => tag.id !== tagId));
    };

    return (
        <div className="space-y-3">
            {/* Selected Tags */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                        <div key={tag.id} className="group relative">
                            <TagBadge tag={tag} clickable={false} />
                            <button
                                type="button"
                                onClick={() => handleRemoveTag(tag.id)}
                                className="absolute -top-2 -right-2 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                                title={t('removeTag')}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Tag Input */}
            {selectedTags.length < maxTags && (
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                        placeholder={t('placeholder', { current: selectedTags.length, max: maxTags })}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    />

                    {/* Dropdown */}
                    {isOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    {t('loading')}
                                </div>
                            ) : availableTags.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    {searchQuery ? t('noTagsFound') : t('allSelected')}
                                </div>
                            ) : (
                                <div className="p-2">
                                    {availableTags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => handleAddTag(tag)}
                                            className="w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors duration-150 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                                <span className="font-medium text-foreground">
                                                    {tag.name}
                                                </span>
                                            </div>
                                            {tag.article_count > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    {tag.article_count} {tag.article_count === 1 ? t('article_one') : t('article_other')}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Helper Text */}
            <p className="text-xs text-muted-foreground">
                {t('helperText', { max: maxTags })}
            </p>
        </div>
    );
}
