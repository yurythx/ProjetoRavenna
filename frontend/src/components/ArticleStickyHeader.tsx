'use client';
export function ArticleStickyHeader(props: {
  title?: string;
  article?: any;
  liked?: boolean;
  likeCount?: number;
  favorited?: boolean;
  onLikeChange?: (l: any, c: any) => void;
  onFavoriteChange?: (f: any) => void;
  onShare?: () => Promise<void>;
  hasToc?: boolean;
  onToggleMobileToc?: () => void;
  children?: React.ReactNode;
}) {
  const t = props.title || props.article?.title || '';
  return <div className="sticky top-0 bg-white/80 backdrop-blur p-2">{t}{props.children}</div>;
}
