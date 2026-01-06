'use client';

import { use } from 'react';
import { ArrowLeft, Tag as TagIcon } from 'lucide-react';
import Link from 'next/link';
import { useArticlesByTag } from '@/hooks/useTags';
import TagBadge from '@/components/TagBadge';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default function TagDetailPage({ params }: PageProps) {
    const { slug } = use(params);
    const { data, isLoading, error } = useArticlesByTag(slug);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-48 mb-8" />
                        <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded w-64 mb-4" />
                        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-96 mb-12" />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-64 bg-gray-300 dark:bg-gray-700 rounded-lg" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <TagIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        Tag não encontrada
                    </h1>
                    <Link
                        href="/tags"
                        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para tags
                    </Link>
                </div>
            </div>
        );
    }

    const { tag, articles, count } = data;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back Link */}
                <Link
                    href="/tags"
                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para tags
                </Link>

                {/* Tag Header */}
                <div className="mb-12 text-center">
                    <div className="inline-block mb-4">
                        <TagBadge tag={tag} size="lg" showCount={true} clickable={false} />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        {tag.name}
                    </h1>
                    {tag.description && (
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            {tag.description}
                        </p>
                    )}
                </div>

                {/* Articles */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        {count === 0
                            ? 'Nenhum artigo encontrado'
                            : `${count} ${count === 1 ? 'artigo' : 'artigos'}`}
                    </h2>

                    {articles.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <p className="text-gray-600 dark:text-gray-400 text-lg">
                                Nenhum artigo publicado com essa tag ainda.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {articles.map((article) => (
                                <Link
                                    key={article.id}
                                    href={`/articles/${article.slug}`}
                                    className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700"
                                >
                                    {/* Banner */}
                                    {article.banner && (
                                        <div className="aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                            <img
                                                src={article.banner}
                                                alt={article.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                            />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="p-6">
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                            {article.title}
                                        </h3>

                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            Por <span className="font-medium">{article.author_name}</span>
                                        </p>

                                        {/* Tags */}
                                        {article.tags && article.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {article.tags.slice(0, 3).map((tagItem: any) => (
                                                    <TagBadge key={tagItem.id} tag={tagItem} size="sm" clickable={false} />
                                                ))}
                                                {article.tags.length > 3 && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                                                        +{article.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
