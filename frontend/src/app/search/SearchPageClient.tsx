'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search as SearchIcon, Filter, X } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { SearchBar } from '@/components/SearchBar';
import { ArticleCard } from '@/components/ArticleCard';

export default function SearchPageClient() {
    const searchParams = useSearchParams();
    const [showFilters, setShowFilters] = useState(false);

    // Get search parameters from URL
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const tags = searchParams.getAll('tags');
    const author = searchParams.get('author') || '';
    const date_from = searchParams.get('from') || '';
    const date_to = searchParams.get('to') || '';
    const ordering = (searchParams.get('sort') as any) || 'relevance';
    const page = parseInt(searchParams.get('page') || '1');

    const { data: cats } = useCategories();
    const { data: allTags } = useTags();

    // Perform search
    const { data, isLoading, error } = useSearch({
        query,
        tags,
        category,
        author,
        date_from,
        date_to,
        ordering,
        page,
    });

    const results = data?.results || [];
    const totalResults = data?.count || 0;

    // Check if any filters are applied
    const hasFilters = !!(tags.length || category || author || date_from || date_to);

    return (
        <div className="container-custom py-12">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">Buscar Artigos</h1>
                <SearchBar
                    placeholder="Digite sua busca..."
                    autoFocus
                />
            </div>

            {/* Results Summary */}
            {query && (
                <div className="mb-6">
                    <p className="text-lg text-muted-foreground">
                        {isLoading ? (
                            'Procurando...'
                        ) : (
                            <>
                                <strong>{totalResults.toLocaleString()}</strong> {totalResults === 1 ? 'resultado' : 'resultados'} para
                                <span className="font-semibold text-foreground"> &quot;{query}&quot;</span>
                            </>
                        )}
                    </p>
                </div>
            )}

            {/* Filter Toggle (Mobile) */}
            <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden flex items-center gap-2 mb-4 text-accent"
            >
                <Filter className="h-5 w-5" />
                {showFilters ? 'Esconder filtros' : 'Mostrar filtros'}
            </button>

            <div className="grid md:grid-cols-[250px_1fr] gap-8">
                {/* Filters Sidebar */}
                <aside className={`${showFilters ? 'block' : 'hidden md:block'} space-y-6`}>
                    <div className="card p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Filtros</h3>
                            {hasFilters && (
                                <Link
                                    href="/search"
                                    className="text-sm text-accent hover:underline"
                                >
                                    Limpar
                                </Link>
                            )}
                        </div>

                        {/* Category Filter */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Categoria</label>
                            <select
                                value={category}
                                onChange={(e) => {
                                    const params = new URLSearchParams(searchParams?.toString() || '');
                                    if (e.target.value) {
                                        params.set('category', e.target.value);
                                    } else {
                                        params.delete('category');
                                    }
                                    window.location.href = `/search?${params.toString()}`;
                                }}
                                className="input w-full"
                            >
                                <option value="">Todas</option>
                                {cats?.map((cat) => (
                                    <option key={cat.id} value={cat.slug}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Tags Filter */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Tags</label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {allTags?.slice(0, 20).map((tag) => (
                                    <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={tags.includes(tag.slug)}
                                            onChange={(e) => {
                                                const params = new URLSearchParams(searchParams?.toString() || '');
                                                params.delete('tags');

                                                const newTags = e.target.checked
                                                    ? [...tags, tag.slug]
                                                    : tags.filter(t => t !== tag.slug);

                                                newTags.forEach(t => params.append('tags', t));
                                                window.location.href = `/search?${params.toString()}`;
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm">{tag.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Sort Filter */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Ordenar por</label>
                            <select
                                value={ordering}
                                onChange={(e) => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set('sort', e.target.value);
                                    window.location.href = `/search?${params.toString()}`;
                                }}
                                className="input w-full"
                            >
                                <option value="relevance">Relevância</option>
                                <option value="-created_at">Mais recentes</option>
                                <option value="created_at">Mais antigos</option>
                            </select>
                        </div>
                    </div>

                    {/* Active Filters */}
                    {hasFilters && (
                        <div className="card p-4">
                            <h4 className="text-sm font-semibold mb-3">Filtros Ativos</h4>
                            <div className="space-y-2">
                                {tags.map(tagSlug => {
                                    const tag = allTags?.find(t => t.slug === tagSlug);
                                    return tag ? (
                                        <div key={tagSlug} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="truncate">{tag.name}</span>
                                            <button
                                                onClick={() => {
                                                    const params = new URLSearchParams(searchParams.toString());
                                                    params.delete('tags');
                                                    tags.filter(t => t !== tagSlug).forEach(t => params.append('tags', t));
                                                    window.location.href = `/search?${params.toString()}`;
                                                }}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : null;
                                })}

                                {category && (
                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="truncate">{cats?.find(c => c.slug === category)?.name}</span>
                                        <button
                                            onClick={() => {
                                                const params = new URLSearchParams(searchParams.toString());
                                                params.delete('category');
                                                window.location.href = `/search?${params.toString()}`;
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </aside>

                {/* Results */}
                <main>
                    {isLoading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="aspect-video bg-gray-200 rounded-lg mb-4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="card p-12 text-center">
                            <SearchIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <p className="text-lg text-muted-foreground">Erro ao buscar artigos</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="card p-12 text-center">
                            <SearchIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h3>
                            <p className="text-muted-foreground mb-4">
                                {query
                                    ? `Não encontramos artigos para "${query}"`
                                    : 'Tente ajustar seus filtros'
                                }
                            </p>
                            <Link href="/artigos" className="btn btn-primary">
                                Ver Todos os Artigos
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                                {results.map((article) => (
                                    <ArticleCard
                                        key={article.id}
                                        article={article as any}
                                        categories={cats}
                                        tagsList={allTags}
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalResults > 25 && (
                                <div className="mt-12 flex justify-center gap-2">
                                    {data?.previous && (
                                        <Link
                                            href={`/search?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: (page - 1).toString() }).toString()}`}
                                            className="btn btn-outline"
                                        >
                                            Anterior
                                        </Link>
                                    )}
                                    <span className="px-4 py-2 text-sm">
                                        Página {page}
                                    </span>
                                    {data?.next && (
                                        <Link
                                            href={`/search?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: (page + 1).toString() }).toString()}`}
                                            className="btn btn-outline"
                                        >
                                            Próxima
                                        </Link>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
