'use client';

import { useEffect, useRef } from 'react';

export function ArticleScrollProgress() {
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let ticking = false;

        const updateProgress = () => {
            if (!barRef.current) return;
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPosition = window.scrollY;
            // Use scaleX for performance (0 to 1) to avoid layout thrashing
            const scale = totalHeight > 0 ? scrollPosition / totalHeight : 0;
            barRef.current.style.transform = `scaleX(${scale})`;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateProgress);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="fixed top-0 left-0 w-full h-1 z-40 bg-transparent pointer-events-none">
            <div 
                ref={barRef}
                className="h-full bg-accent origin-left will-change-transform"
                style={{ transform: 'scaleX(0)' }} 
            />
        </div>
    );
}
