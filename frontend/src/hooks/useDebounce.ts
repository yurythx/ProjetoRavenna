/**
 * Custom hook for debouncing values
 * Useful for search inputs, form fields, etc.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500)
 * @returns Debounced value
 * 
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 400);
 * 
 * useEffect(() => {
 *   // This will only run after user stops typing for 400ms
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup function to cancel timeout if value changes
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
