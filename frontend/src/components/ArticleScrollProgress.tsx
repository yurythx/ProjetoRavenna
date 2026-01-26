'use client';
export function ArticleScrollProgress({ value }: { value?: number }) {
  return <div className="h-1 bg-muted"><div className="h-1" style={{ width: `${value ?? 0}%`, backgroundColor: 'var(--accent)' }} /></div>;
}
