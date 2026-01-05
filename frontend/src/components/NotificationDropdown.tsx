'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import { Inbox } from 'lucide-react';
import Image from 'next/image';

interface NotificationDropdownProps {
    onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
    const router = useRouter();
    const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();

    const handleNotificationClick = (notification: any) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            router.push(notification.link);
        }
        onClose();
    };

    return (
        <div
            className="absolute right-0 mt-2 w-96 rounded-xl shadow-lg border overflow-hidden z-50"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    Notificações
                </h3>
                {notifications.some(n => !n.is_read) && (
                    <button
                        onClick={() => markAllAsRead()}
                        className="text-sm hover:underline"
                        style={{ color: 'var(--accent)' }}
                    >
                        Marcar todas como lidas
                    </button>
                )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div
                            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
                            style={{ borderColor: 'var(--accent)' }}
                        ></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <Inbox
                            className="w-12 h-12 mx-auto mb-2"
                            style={{ color: 'var(--muted-foreground)' }}
                            aria-hidden="true"
                        />
                        <p style={{ color: 'var(--muted-foreground)' }}>
                            Nenhuma notificação
                        </p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className="w-full p-4 border-b hover:bg-muted/50 text-left transition-colors"
                            style={{
                                borderColor: 'var(--border)',
                                background: notification.is_read ? 'transparent' : 'var(--muted)'
                            }}
                        >
                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                {notification.sender?.avatar ? (
                                    <Image
                                        src={notification.sender.avatar}
                                        alt=""
                                        width={40}
                                        height={40}
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ background: 'var(--accent)' + '33' }}
                                    >
                                        <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>
                                            {notification.sender?.first_name?.[0] ||
                                                notification.sender?.username?.[0] ||
                                                notification.sender?.email[0] ||
                                                'S'}
                                        </span>
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                                        {notification.title}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                                        {notification.message}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                                        {notification.time_ago}
                                    </p>
                                </div>

                                {/* Unread indicator */}
                                {!notification.is_read && (
                                    <div
                                        className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                                        style={{ background: 'var(--accent)' }}
                                    ></div>
                                )}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
