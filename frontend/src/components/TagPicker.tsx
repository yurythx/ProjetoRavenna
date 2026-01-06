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

export default function TagPicker({ selectedTags, onChange, maxTags = 10 }: TagPickerProps) {
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
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                title="Remover tag"
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
                        placeholder={`Adicionar tags (${selectedTags.length}/${maxTags})`}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    {/* Dropdown */}
                    {isOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                    Carregando tags...
                                </div>
                            ) : availableTags.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                    {searchQuery ? 'Nenhuma tag encontrada' : 'Todas as tags já foram selecionadas'}
                                </div>
                            ) : (
                                <div className="p-2">
                                    {availableTags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => handleAddTag(tag)}
                                            className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                    {tag.name}
                                                </span>
                                            </div>
                                            {tag.article_count > 0 && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {tag.article_count} {tag.article_count === 1 ? 'artigo' : 'artigos'}
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Selecione até {maxTags} tags para categorizar seu artigo.
            </p>
        </div>
    );
}
