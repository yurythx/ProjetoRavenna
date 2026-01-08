import Link from 'next/link';
import Image from 'next/image';
import { components } from '@/types/api';
import { Calendar, Clock } from 'lucide-react';
import TagBadge from '@/components/TagBadge';
import { Tag } from '@/hooks/useTags';
import { LikeButton } from '@/components/LikeButton';
import { FavoriteButton } from '@/components/FavoriteButton';
import { readingTime } from '@/lib/readingTime';
import ViewCounter from '@/components/ViewCounter';
import ReadingTime from '@/components/ReadingTime';
import { useState } from 'react';

import { Article } from '@/hooks/useArticle';

type Category = components['schemas']['Category'];
type TagType = components['schemas']['Tag'];

export function ArticleCard({
  article,
  categories,
  tagsList,
}: {
  article: Article;
  categories?: Category[];
  tagsList?: Tag[];
}) {
  const [liked, setLiked] = useState<boolean>(!!article.is_liked);
  const [likeCount, setLikeCount] = useState<number>(article.like_count || 0);
  const [favorited, setFavorited] = useState<boolean>(!!article.is_favorited);
  const rawBanner = article.banner || '';
  const banner = rawBanner && /^https?:\/\//.test(rawBanner) ? `/api/img?url=${encodeURIComponent(rawBanner)}` : rawBanner;
  const catName = categories?.find((c) => c.id === article.category)?.name;

  // Get full tag objects instead of just names
  // Get full tag objects instead of just names
  const articleTags = article.tags
    ?.map((tag) => {
      if (typeof tag === 'string') return tagsList?.find((t) => t.id === tag);
      return tag as Tag;
    })
    .filter(Boolean) as Tag[] || [];

  // Create excerpt from content (first 150 chars)
  const excerpt = article.content?.substring(0, 150).replace(/<[^>]*>/g, '') + '...' || '';

  // Format date
  const formattedDate = article.created_at
    ? new Date(article.created_at).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    : '';

  return (
    <div className="card group flex flex-col h-full overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
      {/* Image Container - Linked */}
      <Link href={`/artigos/${article.slug}`} className="relative aspect-[16/9] overflow-hidden block">
        {banner ? (
          <Image
            src={banner}
            alt={article.title || 'Article image'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-border"
          >
            <span className="text-4xl opacity-20">📄</span>
          </div>
        )}

        {/* Category Badge Overlay */}
        {catName && (
          <div className="absolute top-3 left-3 z-10">
            <span
              className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg backdrop-blur-md bg-accent/90 text-white shadow-lg"
            >
              {catName}
            </span>
          </div>
        )}

        {/* Popular Badge if many likes */}
        {likeCount > 10 && (
          <div className="absolute top-3 right-3 z-10">
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1 animate-pulse">
              🔥 Popular
            </span>
          </div>
        )}
      </Link>

      {/* Content Container */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          {/* Metadata */}
          <div className="flex items-center gap-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {formattedDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formattedDate}</span>
              </div>
            )}
            {article.content && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{readingTime(article.content)}</span>
              </div>
            )}
          </div>

          {/* Title - Linked */}
          <Link href={`/artigos/${article.slug}`}>
            <h3
              className="text-lg font-bold line-clamp-2 leading-tight hover:text-accent transition-colors mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              {article.title}
            </h3>
          </Link>

          {/* Excerpt */}
          <p
            className="text-sm line-clamp-3 leading-relaxed text-muted-foreground"
          >
            {excerpt}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-border/50 space-y-4">
          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
              {article.tags.slice(0, 2).map((tag: any) => {
                const tid = typeof tag === 'string' ? tag : tag.id;
                const tagData = tagsList?.find((t: Tag) => t.id === tid) || (typeof tag === 'object' ? tag : null);
                return tagData ? (
                  <TagBadge key={tid} tag={tagData} size="sm" />
                ) : null;
              })}
              {article.tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground font-medium flex items-center">
                  +{article.tags.length - 2} mais
                </span>
              )}
            </div>
          )}

          {/* Actions Bar - NO LINK HERE */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              {article.view_count !== undefined && (
                <ViewCounter count={article.view_count} size="sm" />
              )}
              {article.reading_time && (
                <ReadingTime minutes={article.reading_time} size="sm" />
              )}
            </div>

            {/* Like and Favorite Buttons - Interactive Area */}
            <div className="flex items-center gap-1 px-1 py-1 rounded-full bg-muted/30 border border-border/50">
              <LikeButton
                articleId={article.id}
                initialLiked={liked}
                initialCount={likeCount}
                onChanged={(l, c) => {
                  setLiked(l);
                  setLikeCount(c);
                }}
                size="sm"
                showCount={true}
              />
              <div className="w-[1px] h-3 bg-border" />
              <FavoriteButton
                articleId={article.id}
                initialFavorited={favorited}
                onChanged={(f) => setFavorited(f)}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
