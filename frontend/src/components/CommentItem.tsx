'use client';

import { useState } from 'react';
import { Trash2, Reply, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { CommentForm } from './CommentForm';
import { useTranslations, useLocale } from 'next-intl';

interface CommentItemProps {
    comment: {
        id: string;
        author: {
            id: string;
            email: string;
            username: string | null;
            first_name: string;
            last_name: string;
            avatar: string | null;
        };
        content: string;
        created_at: string;
        is_reply: boolean;
        replies_count: number;
        can_delete: boolean;
        replies?: any[];
    };
    articleId: string;
    onReply: (content: string, parentId: string) => void;
    onDelete: (commentId: string) => void;
    isSubmitting: boolean;
    level?: number;
}

export function CommentItem({
    comment,
    articleId,
    onReply,
    onDelete,
    isSubmitting,
    level = 0
}: CommentItemProps) {
    const t = useTranslations('Comments');
    const locale = useLocale();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const { token } = useAuth();

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return t('now');
        if (diff < 3600) return t('minAgo', { count: Math.floor(diff / 60) });
        if (diff < 86400) return t('hAgo', { count: Math.floor(diff / 3600) });
        if (diff < 604800) return t('daysAgo', { count: Math.floor(diff / 86400) });
        return date.toLocaleDateString(locale);
    };

    const getAuthorName = () => {
        if (comment.author.first_name && comment.author.last_name) {
            return `${comment.author.first_name} ${comment.author.last_name}`;
        }
        if (comment.author.username) {
            return comment.author.username;
        }
        return comment.author.email.split('@')[0];
    };

    const handleReply = (content: string) => {
        onReply(content, comment.id);
        setShowReplyForm(false);
    };

    return (
        <div className="space-y-4">
            <div
                className={`rounded-lg p-4 ${level > 0 ? 'ml-8 border-l-2' : ''}`}
                style={{
                    background: 'var(--card-bg)',
                    borderColor: level > 0 ? 'var(--accent)' : 'var(--border)',
                    border: level === 0 ? '1px solid var(--border)' : undefined
                }}
            >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                    {/* Avatar */}
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--muted)' }}
                    >
                        {comment.author.avatar ? (
                            <Image
                                src={comment.author.avatar}
                                alt={getAuthorName()}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                            />
                        ) : (
                            <UserIcon className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                        )}
                    </div>

                    {/* Author & Time */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                                {getAuthorName()}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                {getTimeAgo(comment.created_at)}
                            </span>
                        </div>

                        {/* Content */}
                        <p className="mt-2 whitespace-pre-wrap break-words" style={{ color: 'var(--foreground)' }}>
                            {comment.content}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-3">
                            {token && level === 0 && (
                                <button
                                    onClick={() => setShowReplyForm(!showReplyForm)}
                                    className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
                                    style={{ color: 'var(--accent)' }}
                                >
                                    <Reply className="w-4 h-4" aria-hidden="true" />
                                    {t('reply')}
                                </button>
                            )}

                            {comment.can_delete && (
                                <button
                                    onClick={() => {
                                        if (confirm(t('deleteConfirm'))) {
                                            onDelete(comment.id);
                                        }
                                    }}
                                    className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                    {t('delete')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reply Form */}
                {showReplyForm && (
                    <div className="mt-4 pl-13">
                        <CommentForm
                            articleId={articleId}
                            parentId={comment.id}
                            onSubmit={handleReply}
                            isSubmitting={isSubmitting}
                            placeholder={t('replyPlaceholder')}
                            autoFocus
                            onCancel={() => setShowReplyForm(false)}
                        />
                    </div>
                )}
            </div>

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="space-y-4">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            articleId={articleId}
                            onReply={onReply}
                            onDelete={onDelete}
                            isSubmitting={isSubmitting}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
