'use client';
import { useState } from 'react';

export function ErrorArt({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="rounded-xl border w-full h-[300px] md:h-[450px] flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--muted) 0%, var(--border) 100%)',
          borderColor: 'var(--border)',
        }}
        aria-label={alt}
      >
        <span style={{ color: 'var(--muted-foreground)', fontSize: '2rem' }}>⚠️</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="rounded-xl border w-full h-auto"
      onError={() => setFailed(true)}
    />
  );
}
