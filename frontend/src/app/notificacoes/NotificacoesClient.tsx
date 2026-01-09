'use client';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import Link from 'next/link';

export default function NotificacoesClient() {
    const { token } = useAuth();
    const router = useRouter();
    const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications(true);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!token) {
            router.push('/auth/login?redirect=/notificacoes');
        }
    }, [token, router]);

    if (!token) {
        return null; // Will redirect
    }

    if (isLoading) {
        return (
            <div className="container-custom py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-muted rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container-custom py-8 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Bell className="h-8 w-8 text-[var(--accent)]" />
                        <h1 className="text-3xl font-bold">Notificações</h1>
                    </div>
                    <p className="text-muted-foreground">
                        {unreadCount > 0
                            ? `Você tem ${unreadCount} ${unreadCount === 1 ? 'nova notificação' : 'novas notificações'}`
                            : 'Nenhuma nova notificação'
                        }
                    </p>
                </div>

                {notifications.length > 0 && unreadCount > 0 && (
                    <button
                        onClick={() => markAllAsRead()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 rounded-lg transition-colors self-start md:self-auto"
                    >
                        <CheckCheck className="h-4 w-4" />
                        Marcar todas como lidas
                    </button>
                )}
            </div>

            {/* Empty State */}
            {notifications.length === 0 ? (
                <div className="text-center py-20 bg-muted/30 rounded-3xl border border-border border-dashed">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                                <Bell className="h-10 w-10 text-muted-foreground/40" />
                            </div>
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">
                            Tudo limpo por aqui
                        </h2>
                        <p className="text-muted-foreground">
                            Nenhuma notificação para exibir no momento.
                        </p>
                    </div>
                </div>
            ) : (
                /* Notifications List */
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`relative group p-4 rounded-xl border transition-all hover:shadow-md ${notification.is_read
                                    ? 'bg-card border-border hover:border-border/80'
                                    : 'bg-[var(--accent)]/5 border-[var(--accent)]/20 hover:border-[var(--accent)]/40'
                                }`}
                        >
                            <div className="flex gap-4">
                                {/* Icon/Avatar */}
                                <div className="shrink-0">
                                    {notification.sender?.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={notification.sender.avatar}
                                            alt=""
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notification.is_read ? 'bg-muted text-muted-foreground' : 'bg-[var(--accent)]/20 text-[var(--accent)]'}`}>
                                            <Bell className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className={`text-sm font-semibold ${notification.is_read ? 'text-foreground' : 'text-foreground'}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0 bg-muted px-2 py-0.5 rounded-full">
                                            <Clock className="h-3 w-3" />
                                            {notification.time_ago}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                                        {notification.message}
                                    </p>
                                    {notification.link && (
                                        <Link
                                            href={notification.link}
                                            onClick={() => !notification.is_read && markAsRead(notification.id)}
                                            className="inline-flex items-center text-xs font-medium text-[var(--accent)] hover:underline"
                                        >
                                            Ver detalhes →
                                        </Link>
                                    )}
                                </div>

                                {/* Unread Indicator */}
                                {!notification.is_read && (
                                    <div className="absolute top-4 right-4 w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" title="Não lida" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
