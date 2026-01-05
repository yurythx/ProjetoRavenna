'use client';

import { useState } from 'react';
import { X, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const toast = useToast();
    const [formData, setFormData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        old: false,
        new: false,
        confirm: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const passwordStrength = (password: string): { strength: number; label: string; color: string } => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 2) return { strength, label: 'Fraca', color: '#ef4444' };
        if (strength <= 3) return { strength, label: 'Média', color: '#f59e0b' };
        return { strength, label: 'Forte', color: '#22c55e' };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setIsLoading(true);

        try {
            await api.post('/auth/change-password/', formData);
            toast.success('Senha alterada com sucesso!');
            setFormData({ old_password: '', new_password: '', confirm_password: '' });
            onClose();
        } catch (error: any) {
            const errorData = error.response?.data;
            if (errorData) {
                setErrors(errorData);
                const firstError = Object.values(errorData)[0];
                toast.error(Array.isArray(firstError) ? firstError[0] : String(firstError));
            } else {
                toast.error('Erro ao alterar senha');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
        // Clear error for this field
        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: '' }));
        }
    };

    if (!isOpen) return null;

    const strength = passwordStrength(formData.new_password);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-xl p-6"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                        <Lock className="w-5 h-5" aria-hidden="true" />
                        Alterar Senha
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        aria-label="Fechar"
                    >
                        <X className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Old Password */}
                    <div>
                        <label htmlFor="old_password" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                            Senha Atual
                        </label>
                        <div className="relative">
                            <input
                                id="old_password"
                                name="old_password"
                                type={showPasswords.old ? 'text' : 'password'}
                                value={formData.old_password}
                                onChange={handleChange}
                                className="w-full px-4 py-2 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent"
                                style={{
                                    background: 'var(--background)',
                                    borderColor: errors.old_password ? '#ef4444' : 'var(--border)',
                                    color: 'var(--foreground)'
                                }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, old: !prev.old }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                aria-label={showPasswords.old ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPasswords.old ? (
                                    <EyeOff className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                                ) : (
                                    <Eye className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                                )}
                            </button>
                        </div>
                        {errors.old_password && (
                            <p className="text-xs mt-1 text-red-500">{errors.old_password}</p>
                        )}
                    </div>

                    {/* New Password */}
                    <div>
                        <label htmlFor="new_password" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                            Nova Senha
                        </label>
                        <div className="relative">
                            <input
                                id="new_password"
                                name="new_password"
                                type={showPasswords.new ? 'text' : 'password'}
                                value={formData.new_password}
                                onChange={handleChange}
                                className="w-full px-4 py-2 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent"
                                style={{
                                    background: 'var(--background)',
                                    borderColor: errors.new_password ? '#ef4444' : 'var(--border)',
                                    color: 'var(--foreground)'
                                }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                aria-label={showPasswords.new ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPasswords.new ? (
                                    <EyeOff className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                                ) : (
                                    <Eye className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                                )}
                            </button>
                        </div>

                        {/* Password Strength */}
                        {formData.new_password && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                        Força da senha
                                    </span>
                                    <span className="text-xs font-medium" style={{ color: strength.color }}>
                                        {strength.label}
                                    </span>
                                </div>
                                <div className="h-2 rounded-full" style={{ background: 'var(--muted)' }}>
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${(strength.strength / 5) * 100}%`,
                                            background: strength.color
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {errors.new_password && (
                            <p className="text-xs mt-1 text-red-500">
                                {Array.isArray(errors.new_password) ? errors.new_password[0] : errors.new_password}
                            </p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label htmlFor="confirm_password" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                            Confirmar Nova Senha
                        </label>
                        <div className="relative">
                            <input
                                id="confirm_password"
                                name="confirm_password"
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={formData.confirm_password}
                                onChange={handleChange}
                                className="w-full px-4 py-2 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent"
                                style={{
                                    background: 'var(--background)',
                                    borderColor: errors.confirm_password ? '#ef4444' : 'var(--border)',
                                    color: 'var(--foreground)'
                                }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                aria-label={showPasswords.confirm ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPasswords.confirm ? (
                                    <EyeOff className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                                ) : (
                                    <Eye className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                                )}
                            </button>
                        </div>
                        {errors.confirm_password && (
                            <p className="text-xs mt-1 text-red-500">{errors.confirm_password}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-outline flex-1"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Alterando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" aria-hidden="true" />
                                    Alterar Senha
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
