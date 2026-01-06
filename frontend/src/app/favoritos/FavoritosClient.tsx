'use client';
import { useUserFavorites } from '@/hooks/useLikes';
import { ArticleCard } from '@/components/ArticleCard';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bookmark, Heart } from 'lucide-react';

export default function FavoritosClient() {
    const { token } = useAuth();
    const router = useRouter();
    const { data, isLoading, error } = useUserFavorites();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!token) {
            router.push('/auth/login?redirect=/favoritos');
        }
    }, [token, router]);

    if (!token) {
        return null; // Will redirect
    }

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-96 bg-muted rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <p className="text-destructive">Erro ao carregar favoritos. Tente novamente.</p>
                </div>
            </div>
        );
    }

    const articles = data?.results || [];
    const count = data?.count || 0;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Bookmark className="h-8 w-8 text-blue-600" />
                    <h1 className="text-3xl font-bold">Meus Favoritos</h1>
                </div>
                <p className="text-muted-foreground">
                    {count === 0
                        ? 'Você ainda não tem artigos favoritos'
                        : `${count} ${count === 1 ? 'artigo salvo' : 'artigos salvos'}`
                    }
                </p>
            </div>

            {/* Empty State */}
            {articles.length === 0 ? (
                <div className="text-center py-16">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="flex justify-center">
                            <div className="relative">
                                <Bookmark className="h-24 w-24 text-muted-foreground/20" />
                                <Heart className="h-12 w-12 text-muted-foreground/20 absolute bottom-0 right-0" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-semibold text-muted-foreground">
                            Nenhum favorito ainda
                        </h2>
                        <p className="text-muted-foreground">
                            Comece a salvar artigos para ler depois clicando no ícone de favorito
                            <Bookmark className="inline h-4 w-4 mx-1" />
                            nos artigos que você gosta.
                        </p>
                        <div className="pt-4">
                            <a
                                href="/artigos"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Explorar Artigos
                            </a>
                        </div>
                    </div>
                </div>
            ) : (
                /* Articles Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.map((article: any) => (
                        <ArticleCard
                            key={article.id}
                            article={article}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
