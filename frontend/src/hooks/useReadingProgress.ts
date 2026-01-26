import { useEffect, useState } from 'react';

export function useReadingProgress(_id?: string, opts?: { onProgress?: (p: number, t: number) => void; enabled?: boolean; disableVisualUpdates?: boolean }) {
  const [progress, setProgress] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const p = h > 0 ? Math.round((y / h) * 100) : 0;
      setProgress(p);
      setTime((t) => t + 1);
      if (opts?.onProgress) opts.onProgress(p, time);
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [opts?.onProgress, time]);
  return { progress };
}
