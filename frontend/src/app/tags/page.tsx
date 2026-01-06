'use client';

import { useState } from 'react';
import { Search, Tag as TagIcon } from 'lucide-react';
import { useTags } from '@/hooks/useTags';
import TagBadge from '@/components/TagBadge';
import TagCloud from '@/components/TagCloud';

export default function TagsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: tags = [], isLoading } = useTags(searchQuery);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                        <TagIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Explorar Tags
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Navegue por categorias e descubra artigos relacionados aos seus interesses
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        />
                    </div>
                </div>

                {/* Tag Cloud Section */}
                {!searchQuery && tags.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                            Nuvem de Tags
                        </h2>
                        <TagCloud tags={tags} maxTags={30} />
                    </div>
                )}

                {/* All Tags Grid */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        {searchQuery ? 'Resultados da Busca' : 'Todas as Tags'}
                    </h2>

                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                                />
                            ))}
                        </div>
                    ) : tags.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400 text-lg">
                                {searchQuery ? 'Nenhuma tag encontrada com esse termo' : 'Nenhuma tag disponível'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-200 dark:border-gray-700"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <TagBadge tag={tag} size="lg" showCount={true} />
                                    </div>
                                    {tag.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                            {tag.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Stats */}
                {tags.length > 0 && (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        Total de {tags.length} {tags.length === 1 ? 'tag' : 'tags'} encontradas
                    </div>
                )}
            </div>
        </div>
    );
}
