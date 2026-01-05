'use client';

import { MessageSquare } from 'lucide-react';
import { useComments } from '@/hooks/useComments';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';

interface CommentSectionProps {
    articleId: string;
}

export function CommentSection({ articleId }: CommentSectionProps) {
    const { comments, isLoading, createComment, isCreating, deleteComment } = useComments(articleId);

    const handleCreateComment = (content: string) => {
        createComment({
            article: articleId,
            content,
            parent: null,
        });
    };

    const handleReply = (content: string, parentId: string) => {
        createComment({
            article: articleId,
            content,
            parent: parentId,
        });
    };

    const handleDelete = (commentId: string) => {
        deleteComment(commentId);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6" style={{ color: 'var(--accent)' }} aria-hidden="true" />
                <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                    Comentários
                    {comments.length > 0 && (
                        <span className="ml-2 text-lg" style={{ color: 'var(--muted-foreground)' }}>
                            ({comments.length})
                        </span>
                    )}
                </h2>
            </div>

            {/* New Comment Form */}
            <CommentForm
                articleId={articleId}
                onSubmit={handleCreateComment}
                isSubmitting={isCreating}
            />

            {/* Comments List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div
                        className="animate-spin rounded-full h-8 w-8 border-b-2"
                        style={{ borderColor: 'var(--accent)' }}
                    ></div>
                </div>
            ) : comments.length === 0 ? (
                <div
                    className="text-center py-12 rounded-lg border"
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
                >
                    <MessageSquare
                        className="w-12 h-12 mx-auto mb-3"
                        style={{ color: 'var(--muted-foreground)' }}
                        aria-hidden="true"
                    />
                    <p className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>
                        Nenhum comentário ainda
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                        Seja o primeiro a comentar!
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            articleId={articleId}
                            onReply={handleReply}
                            onDelete={handleDelete}
                            isSubmitting={isCreating}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
