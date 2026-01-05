'use client';

import { LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: number;
    change?: number; // Percentage change
    icon: LucideIcon;
    iconColor: string;
    bgColor: string;
}

export function KPICard({ title, value, change, icon: Icon, iconColor, bgColor }: KPICardProps) {
    return (
        <div
            className="rounded-xl p-6 border transition-all hover:shadow-lg"
            style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border)'
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: bgColor }}
                >
                    <Icon className="w-6 h-6" style={{ color: iconColor }} aria-hidden="true" />
                </div>
                {change !== undefined && change !== null && (
                    <span
                        className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                        {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                    </span>
                )}
            </div>
            <h3 className="text-3xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                {value.toLocaleString()}
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {title}
            </p>
        </div>
    );
}
