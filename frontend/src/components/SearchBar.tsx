'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';
import { useSearchAutocomplete } from '@/hooks/useSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslations } from 'next-intl';

interface SearchBarProps {
    placeholder?: string;
    autoFocus?: boolean;
    onSearch?: (query: string) => void;
    className?: string;
}

export function SearchBar({
    placeholder,
    autoFocus = false,
    onSearch,
    className = ''
}: SearchBarProps) {
    const t = useTranslations('Header');
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    // Debounce query for autocomplete
    const debouncedQuery = useDebounce(query, 300);

    // Fetch autocomplete suggestions
    const { data: autocompleteData, isLoading } = useSearchAutocomplete(
        debouncedQuery,
        showAutocomplete && debouncedQuery.length >= 2
    );

    const results = autocompleteData?.results || [];

    // Handle search submission
    const handleSearch = (searchQuery?: string) => {
        const finalQuery = searchQuery || query;
        if (!finalQuery.trim()) return;

        setShowAutocomplete(false);

        if (onSearch) {
            onSearch(finalQuery);
        } else {
            router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showAutocomplete || results.length === 0) {
            if (e.key === 'Enter') {
                handleSearch();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < results.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    router.push(`/artigos/${results[selectedIndex].slug}`);
                    setShowAutocomplete(false);
                    setQuery('');
                } else {
                    handleSearch();
                }
                break;
            case 'Escape':
                setShowAutocomplete(false);
                setSelectedIndex(-1);
                break;
        }
    };

    // Clear search
    const handleClear = () => {
        setQuery('');
        setShowAutocomplete(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    // Click outside to close autocomplete
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                autocompleteRef.current &&
                !autocompleteRef.current.contains(event.target as Node) &&
                !inputRef.current?.contains(event.target as Node)
            ) {
                setShowAutocomplete(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowAutocomplete(true);
                        setSelectedIndex(-1);
                    }}
                    onFocus={() => setShowAutocomplete(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || t('searchPlaceholder')}
                    autoFocus={autoFocus}
                    className="input pl-10 pr-12 w-full"
                    aria-label={t('searchPlaceholder')}
                    aria-autocomplete="list"
                    aria-controls="search-autocomplete"
                    aria-expanded={showAutocomplete && results.length > 0}
                />

                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={t('clearSearch')}
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}

                {isLoading && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                )}
            </div>

            {/* Autocomplete Dropdown */}
            {showAutocomplete && results.length > 0 && (
                <div
                    ref={autocompleteRef}
                    id="search-autocomplete"
                    className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto"
                    role="listbox"
                >
                    {results.map((result, index) => (
                        <button
                            key={result.id}
                            onClick={() => {
                                router.push(`/artigos/${result.slug}`);
                                setShowAutocomplete(false);
                                setQuery('');
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                                }`}
                            role="option"
                            aria-selected={index === selectedIndex}
                        >
                            <div className="flex items-center gap-3">
                                <Search className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="text-sm font-medium truncate">{result.title}</span>
                            </div>
                        </button>
                    ))}

                    <button
                        onClick={() => handleSearch()}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-accent font-medium"
                    >
                        {t('viewAllResults', { query })}
                    </button>
                </div>
            )}
        </div>
    );
}
