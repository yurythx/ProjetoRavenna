'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { CaptchaWidget } from './CaptchaWidget';

interface CommentFormProps {
    articleId: string;
    parentId?: string | null;
    onSubmit: (content: string, guest?: { name?: string; email?: string; phone?: string; hp?: string; captcha?: string }) => void;
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
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [hp, setHp] = useState('');
    const [captchaToken, setCaptchaToken] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        if (token) {
            onSubmit(content.trim());
        } else {
            if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) return;
            if (!captchaToken) return;
            onSubmit(content.trim(), { name: guestName.trim(), email: guestEmail.trim(), phone: guestPhone.trim(), hp, captcha: captchaToken });
        }
        setContent('');
        setGuestName('');
        setGuestEmail('');
        setGuestPhone('');
        setHp('');
        setCaptchaToken('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {!token && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                        type="text"
                        placeholder="Seu nome"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                        maxLength={120}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Seu e-mail"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                        required
                    />
                    <input
                        type="tel"
                        placeholder="Seu telefone (DDD + número)"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                        required
                    />
                </div>
            )}
            {/* Honeypot hidden input to deter bots */}
            <input
                type="text"
                name="website"
                aria-hidden="true"
                tabIndex={-1}
                style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}
                value={hp}
                onChange={(e) => setHp(e.target.value)}
            />
            {!token && (
                <CaptchaWidget onToken={(t) => setCaptchaToken(t)} />
            )}
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
                        disabled={!content.trim() || (!token && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim())) || isSubmitting}
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
