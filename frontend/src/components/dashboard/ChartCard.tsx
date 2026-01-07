'use client';

interface ChartCardProps {
    title: string;
    children: React.ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
    return (
        <div
            className="rounded-xl p-6 border"
            style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border)'
            }}
        >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                {title}
            </h3>
            <div className="h-80 w-full min-w-0">
                {children}
            </div>
        </div>
    );
}
