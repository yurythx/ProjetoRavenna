'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Palette, Globe, CheckCircle, ChevronRight, ChevronLeft, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Mail, Shield } from 'lucide-react';

interface OnboardingWizardProps {
    config: any;
}

export function OnboardingWizard({ config }: OnboardingWizardProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        brand_name: config?.brand_name || '',
        primary_color: config?.primary_color || '#10b981',
        secondary_color: config?.secondary_color || '#1f2937',
        default_theme: config?.default_theme || 'light',
        default_language: config?.default_language || 'pt-br',
        smtp_host: config?.smtp_host || '',
        smtp_port: config?.smtp_port || 587,
        smtp_user: config?.smtp_user || '',
        smtp_password: config?.smtp_password || '',
        smtp_use_tls: config?.smtp_use_tls ?? true,
        email_from_address: config?.email_from_address || '',
        email_from_name: config?.email_from_name || '',
    });
    const t = useTranslations('Onboarding');
    const tc = useTranslations('Common');
    const [isVisible, setIsVisible] = useState(!config?.onboarding_completed);
    const queryClient = useQueryClient();

    if (!isVisible) return null;

    const handleNext = () => setStep(s => s + 1);
    const handlePrev = () => setStep(s => s - 1);

    const handleFinish = async () => {
        try {
            await api.patch('/entities/config/', {
                ...formData,
                onboarding_completed: true
            });
            queryClient.invalidateQueries({ queryKey: ['tenant-config'] });
            setIsVisible(false);
        } catch (error) {
            console.error("Error saving onboarding:", error);
        }
    };

    const steps = [
        {
            title: t('stepWelcome'),
            desc: t('stepWelcomeDesc'),
            icon: Rocket,
            content: (
                <div className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('brandName')}</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg bg-background"
                            value={formData.brand_name}
                            onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                            placeholder={t('brandPlaceholder')}
                        />
                    </div>
                </div>
            )
        },
        {
            title: t('stepAppearance'),
            desc: t('stepAppearanceDesc'),
            icon: Palette,
            content: (
                <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('primaryColor')}</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                className="h-10 w-20 border rounded cursor-pointer"
                                value={formData.primary_color}
                                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                            />
                            <input
                                type="text"
                                className="flex-1 p-2 border rounded-lg bg-background text-sm"
                                value={formData.primary_color}
                                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('secondaryColor')}</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                className="h-10 w-20 border rounded cursor-pointer"
                                value={formData.secondary_color}
                                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                            />
                            <input
                                type="text"
                                className="flex-1 p-2 border rounded-lg bg-background text-sm"
                                value={formData.secondary_color}
                                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: t('stepRegion'),
            desc: t('stepRegionDesc'),
            icon: Globe,
            content: (
                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('defaultTheme')}</label>
                            <select
                                className="w-full p-2 border rounded-lg bg-background"
                                value={formData.default_theme}
                                onChange={(e) => setFormData({ ...formData, default_theme: e.target.value })}
                            >
                                <option value="light">{t('themeLight')}</option>
                                <option value="dark">{t('themeDark')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('language')}</label>
                            <select
                                className="w-full p-2 border rounded-lg bg-background"
                                value={formData.default_language}
                                onChange={(e) => setFormData({ ...formData, default_language: e.target.value })}
                            >
                                <option value="pt-br">Português</option>
                                <option value="en">English</option>
                                <option value="es">Español</option>
                            </select>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: t('stepCommunication'),
            desc: t('stepCommunicationDesc'),
            icon: Mail,
            content: (
                <div className="space-y-4 pt-4 h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">{t('smtpHost')}</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg bg-background"
                                value={formData.smtp_host}
                                onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                                placeholder={t('smtpHostPlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('smtpPort')}</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded-lg bg-background"
                                value={formData.smtp_port}
                                onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="flex items-end pb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.smtp_use_tls}
                                    onChange={(e) => setFormData({ ...formData, smtp_use_tls: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                />
                                <span className="text-sm">{t('smtpUseTls')}</span>
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('smtpUser')}</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg bg-background"
                                value={formData.smtp_user}
                                onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('smtpPassword')}</label>
                            <input
                                type="password"
                                className="w-full p-2 border rounded-lg bg-background"
                                value={formData.smtp_password}
                                onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="border-t pt-4 mt-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{t('senderIdentity')}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('senderEmail')}</label>
                                <input
                                    type="email"
                                    className="w-full p-2 border rounded-lg bg-background"
                                    value={formData.email_from_address}
                                    onChange={(e) => setFormData({ ...formData, email_from_address: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('senderName')}</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-lg bg-background"
                                    value={formData.email_from_name}
                                    onChange={(e) => setFormData({ ...formData, email_from_name: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const currentStep = steps[step - 1];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 bg-muted/50 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                            <currentStep.icon size={24} />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">{currentStep.title}</h2>
                            <p className="text-sm text-muted-foreground">{currentStep.desc}</p>
                        </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                        {t('stepCounter', { current: step, total: steps.length })}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-muted">
                    <motion.div
                        className="h-full bg-brand-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / steps.length) * 100}%` }}
                    />
                </div>

                {/* Body */}
                <div className="p-8 min-h-[220px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {currentStep.content}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-muted/30 flex items-center justify-between">
                    {step > 1 ? (
                        <button
                            onClick={handlePrev}
                            className="flex items-center gap-2 text-sm font-medium hover:text-brand-primary transition-colors"
                        >
                            <ChevronLeft size={18} /> {tc('back')}
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {step < steps.length ? (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20"
                        >
                            {tc('next')} <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20"
                        >
                            {t('finish')} <CheckCircle size={18} />
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
