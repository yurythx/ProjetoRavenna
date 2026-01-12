/**
 * Hook for tracking reading progress and time spent
 * 
 * Features:
 * - Tracks scroll position (0-100%)
 * - Calculates time spent on page
 * - Debounced callbacks to prevent excessive updates
 * - Automatic cleanup on unmount
 * 
 * @example
 * const { progress } = useReadingProgress(articleId, (progress, timeSpent) => {
 *   trackView({ reading_progress: progress, time_spent: timeSpent });
 * });
 */

import { useEffect, useRef, useState } from 'react';

interface UseReadingProgressOptions {
    /**
     * Callback fired when progress milestones are reached (every 10%)
     * or every 30 seconds
     */
    onProgress?: (progress: number, timeSpent: number) => void;

    /**
     * Enable/disable tracking
     * @default true
     */
    enabled?: boolean;

    /**
     * Progress threshold for callback (percentage)
     * @default 10
     */
    progressThreshold?: number;

    /**
     * Time threshold for callback (seconds)
     * @default 30
     */
    timeThreshold?: number;

    /**
     * Disable visual state updates (progress/timeSpent) if not needed for rendering.
     * Useful when you only need the onProgress callback.
     * @default false
     */
    disableVisualUpdates?: boolean;
}

interface UseReadingProgressReturn {
    /**
     * Current reading progress (0-100)
     */
    progress: number;

    /**
     * Time spent on page (seconds)
     */
    timeSpent: number;

    /**
     * Whether user has reached the bottom (>95%)
     */
    reachedBottom: boolean;
}

// Throttle function helper
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    } as T;
}

export const useReadingProgress = (
    articleId: string,
    options: UseReadingProgressOptions = {}
): UseReadingProgressReturn => {
    const {
        onProgress,
        enabled = true,
        progressThreshold = 10,
        timeThreshold = 30,
        disableVisualUpdates = false,
    } = options;

    const [progress, setProgress] = useState(0);
    const [timeSpent, setTimeSpent] = useState(0);
    const [reachedBottom, setReachedBottom] = useState(false);

    const startTimeRef = useRef<number>(Date.now());
    const lastReportedProgressRef = useRef<number>(0);
    const lastReportedTimeRef = useRef<number>(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled) return;

        // Reset on mount
        startTimeRef.current = Date.now();
        lastReportedProgressRef.current = 0;
        lastReportedTimeRef.current = 0;

        const calculateProgress = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;

            // Calculate scroll percentage
            const totalScrollable = documentHeight - windowHeight;
            const scrollPercentage = totalScrollable > 0
                ? (scrollTop / totalScrollable) * 100
                : 0;

            const newProgress = Math.min(100, Math.max(0, Math.round(scrollPercentage)));
            
            if (!disableVisualUpdates) {
                setProgress(newProgress);
            }

            // Check if reached bottom (>95%)
            if (newProgress >= 95 && !reachedBottom) {
                setReachedBottom(true);
            }

            return newProgress;
        };

        const handleScroll = throttle(() => {
            const newProgress = calculateProgress();
            const currentTimeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
            
            if (!disableVisualUpdates) {
                setTimeSpent(currentTimeSpent);
            }

            // Check if we should trigger callback
            const progressDiff = Math.abs(newProgress - lastReportedProgressRef.current);
            const timeDiff = currentTimeSpent - lastReportedTimeRef.current;

            if (
                progressDiff >= progressThreshold ||
                timeDiff >= timeThreshold
            ) {
                onProgress?.(newProgress, currentTimeSpent);
                lastReportedProgressRef.current = newProgress;
                lastReportedTimeRef.current = currentTimeSpent;
            }
        }, 100); // Throttle to run at most once every 100ms (10fps for logic, enough for analytics)

        // Track time spent every second
        intervalRef.current = setInterval(() => {
            const currentTimeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
            if (!disableVisualUpdates) {
                setTimeSpent(currentTimeSpent);
            }
        }, 1000);

        // Initial progress calculation
        calculateProgress();

        // Add scroll listener
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Cleanup
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [articleId, enabled, onProgress, progressThreshold, timeThreshold, reachedBottom, disableVisualUpdates]);

    return {
        progress,
        timeSpent,
        reachedBottom,
    };
};
