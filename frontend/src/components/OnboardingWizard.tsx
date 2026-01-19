'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Palette, Globe, CheckCircle, ChevronRight, ChevronLeft, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

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
    });
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
            title: "Bem-vindo ao Ravenna",
            desc: "Vamos configurar a identidade do seu portal em segundos.",
            icon: Rocket,
            content: (
                <div className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nome da Marca</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg bg-background"
                            value={formData.brand_name}
                            onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                            placeholder="Ex: Minha Empresa"
                        />
                    </div>
                </div>
            )
        },
        {
            title: "Cores da Marca",
            desc: "Escolha as cores que definem seu portal.",
            icon: Palette,
            content: (
                <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Cor Primária</label>
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
                        <label className="block text-sm font-medium mb-1">Cor Secundária</label>
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
            title: "Preferências Globais",
            desc: "Configure o idioma e o visual padrão.",
            icon: Globe,
            content: (
                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Tema Padrão</label>
                            <select
                                className="w-full p-2 border rounded-lg bg-background"
                                value={formData.default_theme}
                                onChange={(e) => setFormData({ ...formData, default_theme: e.target.value })}
                            >
                                <option value="light">Claro</option>
                                <option value="dark">Escuro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Idioma</label>
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
                        Passo {step} de {steps.length}
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
                            <ChevronLeft size={18} /> Voltar
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {step < steps.length ? (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20"
                        >
                            Próximo <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20"
                        >
                            Finalizar Setup <CheckCircle size={18} />
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
