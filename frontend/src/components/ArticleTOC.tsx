'use client';

import { useEffect, useState } from 'react';

interface TOCItem {
    id: string;
    text: string;
    level: number;
}

interface ArticleTOCProps {
    items: TOCItem[];
}

interface MobileTOCProps {
    items: TOCItem[];
    onClose: () => void;
}

export function ArticleTOC({ items }: ArticleTOCProps) {
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
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

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            // Adjust scroll position for sticky header
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="sticky top-24 bg-card rounded-xl border border-border p-6 shadow-sm">
            <h5 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                Neste artigo
            </h5>
            <nav className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item, i) => (
                    <a
                        key={`${item.id}-${i}`}
                        href={`#${item.id}`}
                        onClick={(e) => handleClick(e, item.id)}
                        className={`block py-1.5 text-sm transition-all border-l-2 pl-3 ${
                            item.id === activeId 
                                ? 'border-primary text-primary font-medium' 
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                        style={{ marginLeft: `${(item.level - 1) * 8}px` }}
                    >
                        {item.text}
                    </a>
                ))}
            </nav>
        </div>
    );
}

export function MobileTOC({ items, onClose }: MobileTOCProps) {
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
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

    return (
        <div id="mobile-toc" className="hidden absolute top-full left-0 right-0 bg-background border-b border-border p-6 shadow-2xl lg:hidden max-h-[60vh] overflow-y-auto z-50">
            <div className="flex items-center justify-between mb-4">
                <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Neste artigo
                </h5>
                <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <nav className="space-y-3">
                {items.map((item, i) => (
                    <a
                        key={`${item.id}-mob-${i}`}
                        href={`#${item.id}`}
                        className={`block text-sm transition-all ${
                            item.id === activeId 
                                ? 'text-primary font-bold' 
                                : 'text-muted-foreground hover:text-primary'
                        }`}
                        style={{ marginLeft: `${(item.level - 1) * 8}px` }}
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                            onClose();
                        }}
                    >
                        {item.text}
                    </a>
                ))}
            </nav>
        </div>
    );
}
