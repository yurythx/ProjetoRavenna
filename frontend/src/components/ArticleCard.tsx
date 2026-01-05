import Link from 'next/link';
import Image from 'next/image';
import { components } from '@/types/api';
import { Badge } from './Badge';
import { readingTime } from '@/lib/readingTime';
import { Clock, Calendar, ArrowRight } from 'lucide-react';

type Article = components['schemas']['Article'];
type FrontArticle = Article & { banner?: string };

type Category = components['schemas']['Category'];
type Tag = components['schemas']['Tag'];

export function ArticleCard({
  article,
  categories,
  tagsList,
}: {
  article: FrontArticle;
  categories?: Category[];
  tagsList?: Tag[];
}) {
  const rawBanner = article.banner || '';
  const banner = rawBanner && /^https?:\/\//.test(rawBanner) ? `/api/img?url=${encodeURIComponent(rawBanner)}` : rawBanner;
  const catName = categories?.find((c) => c.id === article.category)?.name;
  const tagNames =
    article.tags?.map((tid) => tagsList?.find((t) => t.id === tid)?.name).filter(Boolean) || [];

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

        {/* Tags */}
        <div className="flex flex-wrap gap-2 pt-2">
          {tagNames.slice(0, 3).map((n, i) => (
            <Badge key={i}>{n as string}</Badge>
          ))}
        </div>

        {/* Read More Link */}
        <div className="pt-2">
          <span
            className="inline-flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all"
            style={{ color: 'var(--accent)' }}
          >
            Ler mais
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}


