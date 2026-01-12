'use client';
import { useEffect, useState } from 'react';

export interface TocItem {
    id: string;
    text: string;
    level: number;
}

interface ArticleTOCProps {
    items: TocItem[];
    activeId?: string; // Optional: if passed from parent
}

export const ArticleTOC = ({ items }: ArticleTOCProps) => {
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        if (items.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '0px 0px -80% 0px', threshold: 0.1 }
        );

        items.forEach((item) => {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [items]);

    if (items.length === 0) return null;

    return (
        <div className="sticky top-24 bg-card rounded-xl border border-border p-6 shadow-sm">
            <h5 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Neste artigo</h5>
            <nav className="space-y-1">
                {items.map((item, i) => (
                    <a
                        key={`${item.id}-${i}`}
                        href={`#${item.id}`}
                        className={`block py-1.5 text-sm transition-all border-l-2 pl-3 ${
                            item.id === activeId 
                                ? 'border-accent text-accent font-medium' 
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                        style={{ marginLeft: `${(item.level - 1) * 8}px` }}
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        {item.text}
                    </a>
                ))}
            </nav>
        </div>
    );
};

export const MobileTOC = ({ items, onClose }: { items: TocItem[]; onClose: () => void }) => {
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        if (items.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '0px 0px -80% 0px', threshold: 0.1 }
        );

        items.forEach((item) => {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [items]);

    if (items.length === 0) return null;

    return (
        <div id="mobile-toc" className="hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 p-6 shadow-2xl lg:hidden max-h-[60vh] overflow-y-auto z-50">
            <h5 className="font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-4">Neste artigo</h5>
            <nav className="space-y-3">
                {items.map((item, i) => (
                    <a
                        key={`${item.id}-mob-${i}`}
                        href={`#${item.id}`}
                        className={`block text-sm transition-all ${
                            item.id === activeId 
                                ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                        style={{ marginLeft: `${(item.level - 1) * 8}px` }}
                        onClick={() => {
                            onClose();
                            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        {item.text}
                    </a>
                ))}
            </nav>
        </div>
    );
};
