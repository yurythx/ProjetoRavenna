'use client';
import { Suspense } from 'react';
import SearchPageClient from './SearchPageClient';

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="container-custom py-12">
                <div className="animate-pulse">
                    <div className="h-12 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-24 bg-gray-200 rounded mb-8"></div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-64 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        }>
            <SearchPageClient />
        </Suspense>
    );
}
