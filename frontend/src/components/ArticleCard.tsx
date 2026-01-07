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
  const articleTags = article.tags
    ?.map((tagId) => tagsList?.find((t) => t.id === tagId))
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
    <Link href={`/artigos/${article.slug}`} className="card group block h-full">
      {/* Image Container */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {banner ? (
          <Image
            src={banner}
            alt={article.title || 'Article image'}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--muted) 0%, var(--border) 100%)' }}
          >
            <span style={{ color: 'var(--muted-foreground)', fontSize: '3rem' }}>📄</span>
          </div>
        )}

        {/* Category Badge Overlay */}
        {catName && (
          <div className="absolute top-3 left-3">
            <span
              className="px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-sm"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {catName}
            </span>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-5 space-y-3">
        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
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

        {/* Title */}
        <h3
          className="heading-3 text-lg line-clamp-2 group-hover:text-accent transition-colors"
          style={{ color: 'var(--foreground)' }}
        >
          {article.title}
        </h3>

        {/* Excerpt */}
        <p
          className="text-sm line-clamp-3"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {excerpt}
        </p>
        {/* Footer */}
        <div className="space-y-3">
          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.slice(0, 3).map((tag: any) => {
                const tagData = tagsList?.find((t: Tag) => t.id === tag.id);
                return tagData ? (
                  <TagBadge key={tag.id} tag={tagData} size="sm" />
                ) : (
                  <span key={tag.id} className="badge badge-outline text-xs">
                    {tag.name}
                  </span>
                );
              })}
              {article.tags.length > 3 && (
                <span className="badge badge-outline text-xs">
                  +{article.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Metadata and Actions */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                {/* View Counter */}
                {article.view_count !== undefined && (
                  <ViewCounter count={article.view_count} size="sm" />
                )}
                {/* Reading Time */}
                {article.reading_time && (
                  <ReadingTime minutes={article.reading_time} size="sm" />
                )}
              </div>
            </div>

            {/* Like and Favorite Buttons */}
            <div className="flex items-center gap-2">
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
    </Link>
  );
}
