'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CommentFormProps {
    articleId: string;
    parentId?: string | null;
    onSubmit: (content: string) => void;
    isSubmitting: boolean;
    placeholder?: string;
    autoFocus?: boolean;
    onCancel?: () => void;
}

export function CommentForm({
    articleId,
    parentId,
    onSubmit,
    isSubmitting,
    placeholder = 'Escreva seu comentário...',
    autoFocus = false,
    onCancel
}: CommentFormProps) {
    const [content, setContent] = useState('');
    const { token } = useAuth();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !token) return;

        onSubmit(content.trim());
        setContent('');
    };

    if (!token) {
        return (
            <div
                className="p-4 rounded-lg border text-center"
                style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
            >
                <p style={{ color: 'var(--muted-foreground)' }}>
                    Faça login para comentar
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                }}
                rows={3}
                maxLength={1000}
                autoFocus={autoFocus}
                disabled={isSubmitting}
            />

            <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {content.length}/1000 caracteres
                </p>

                <div className="flex gap-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn btn-outline px-4 py-2"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={!content.trim() || isSubmitting}
                        className="btn btn-primary px-6 py-2 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" aria-hidden="true" />
                                Enviar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}
