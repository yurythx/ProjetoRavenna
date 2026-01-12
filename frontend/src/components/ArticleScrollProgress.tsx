'use client';
import { useEffect, useState } from 'react';

export const ArticleScrollProgress = () => {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        let ticking = false;

        const updateProgress = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPosition = window.scrollY;
            const newProgress = totalHeight > 0 ? (scrollPosition / totalHeight) * 100 : 0;
            setWidth(newProgress);
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
        <div 
            className="fixed top-0 left-0 h-1 z-[70] transition-all duration-100 ease-out will-change-[width]"
            style={{ width: `${width}%`, background: 'var(--accent)' }} 
        />
    );
};
