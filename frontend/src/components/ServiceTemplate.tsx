import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Check, Target, Award, Lightbulb } from 'lucide-react';
import { servicesData } from '@/data/services';
import * as Icons from 'lucide-react';

interface ServiceTemplateProps {
    serviceId: string; // Para excluir da lista "Outros Serviços"
    title: string;
    color: string;
    shortDescription: string;
    fullDescription: string;
    whyUse: string;
    url: string;
    internal: boolean;
    badge?: string;
    icon: React.ReactNode; // Componente de ícone já instanciado (ex: <Cpu />)
    features: string[];
    useCases: string[];
    benefits: string[];
    technologies: string[];
}

export default function ServiceTemplate(props: ServiceTemplateProps) {
    const {
        serviceId,
        title,
        color,
        shortDescription,
        fullDescription,
        whyUse,
        url,
        internal,
        badge,
        icon,
        features,
        useCases,
        benefits,
        technologies
    } = props;

    return (
        <div className="min-h-screen">
            {/* Header com Breadcrumb */}
            <section
                className="py-12 border-b"
                style={{
                    borderColor: 'var(--border)',
                    background: 'linear-gradient(135deg, var(--background) 0%, var(--muted) 100%)'
                }}
            >
                <div className="container-custom">
                    <Link
                        href="/#servicos"
                        className="inline-flex items-center gap-2 text-sm mb-6 hover:underline"
                        style={{ color: 'var(--django-green-primary)' }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para Serviços
                    </Link>

                    <div className="flex items-start gap-6">
                        <div
                            className="p-4 rounded-xl"
                            style={{
                                background: `${color}15`,
                                color: color
                            }}
                        >
                            <div className="w-12 h-12 flex items-center justify-center">
                                {/* Clone element to ensure size props if passed purely as component, 
                                    but usually passing <Icon className="..." /> works best */}
                                {icon}
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <h1 className="heading-1 mb-0">{title}</h1>
                                {badge && (
                                    <span
                                        className="text-xs px-3 py-1 rounded-full font-semibold"
                                        style={{
                                            background: 'var(--django-green-primary)',
                                            color: 'white'
                                        }}
                                    >
                                        {badge}
                                    </span>
                                )}
                            </div>
                            <p className="body-large" style={{ color: 'var(--muted-foreground)' }}>
                                {shortDescription}
                            </p>

                            <div className="flex gap-4 mt-6">
                                {internal ? (
                                    <Link
                                        href={url}
                                        className="btn btn-primary flex items-center gap-2"
                                    >
                                        Acessar Módulo
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                ) : (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary flex items-center gap-2"
                                    >
                                        Abrir Serviço
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Conteúdo Principal */}
            <section className="py-16">
                <div className="container-custom">
                    <div className="grid lg:grid-cols-3 gap-12">
                        {/* Coluna Principal */}
                        <div className="lg:col-span-2 space-y-12">
                            {/* Sobre o Serviço */}
                            <div>
                                <h2 className="heading-2 mb-4">Sobre o Serviço</h2>
                                <div className="prose max-w-none">
                                    <p style={{ color: 'var(--foreground)', lineHeight: '1.8' }}>
                                        {fullDescription}
                                    </p>
                                </div>
                            </div>

                            {/* Por Que Usar */}
                            <div
                                className="p-6 rounded-lg"
                                style={{
                                    background: `linear-gradient(135deg, ${color}10, ${color}05)`,
                                    border: `2px solid ${color}30`
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className="p-3 rounded-lg flex-shrink-0"
                                        style={{ background: `${color}20`, color: color }}
                                    >
                                        <Lightbulb className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="heading-2 mb-3" style={{ color: color }}>Por Que Usar</h2>
                                        <p style={{ color: 'var(--foreground)', lineHeight: '1.8' }}>
                                            {whyUse}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Recursos Principais */}
                            <div>
                                <h2 className="heading-2 mb-6">Recursos Principais</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {features.map((feature, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-3 p-4 rounded-lg"
                                            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                                        >
                                            <div
                                                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                                style={{ background: `${color}20` }}
                                            >
                                                <Check className="w-3 h-3" style={{ color: color }} />
                                            </div>
                                            <span style={{ color: 'var(--foreground)' }}>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Onde é Aplicado (Casos de Uso) */}
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <Target className="w-6 h-6" style={{ color: color }} />
                                    <h2 className="heading-2 mb-0">Onde é Aplicado</h2>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {useCases.map((useCase, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-3 p-4 rounded-lg"
                                            style={{
                                                background: 'var(--card-bg)',
                                                border: `1px solid var(--border)`,
                                                borderLeft: `3px solid ${color}`
                                            }}
                                        >
                                            <span style={{ color: 'var(--foreground)' }}>{useCase}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Vantagens */}
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <Award className="w-6 h-6" style={{ color: color }} />
                                    <h2 className="heading-2 mb-0">Vantagens</h2>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {benefits.map((benefit, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-3 p-4 rounded-lg"
                                            style={{
                                                background: `${color}05`,
                                                border: `1px solid ${color}20`
                                            }}
                                        >
                                            <div
                                                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                                style={{ background: color }}
                                            >
                                                <Check className="w-3 h-3" style={{ color: 'white' }} />
                                            </div>
                                            <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{benefit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Tecnologias */}
                            <div
                                className="p-6 rounded-lg"
                                style={{ background: 'var(--card-bg)', border: `2px solid ${color}30` }}
                            >
                                <h3 className="heading-3 mb-4">Tecnologias</h3>
                                <div className="flex flex-wrap gap-2">
                                    {technologies.map((tech, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 rounded-full text-sm font-medium"
                                            style={{
                                                background: `${color}15`,
                                                color: color,
                                                border: `1px solid ${color}30`
                                            }}
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Tipo de Acesso */}
                            <div
                                className="p-6 rounded-lg"
                                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                            >
                                <h3 className="heading-3 mb-3">Tipo de Acesso</h3>
                                <p style={{ color: 'var(--muted-foreground)' }}>
                                    {internal ? 'Módulo Interno' : 'Serviço Externo'}
                                </p>
                            </div>

                            {/* CTA Card */}
                            <div
                                className="p-6 rounded-lg text-center"
                                style={{
                                    background: `linear-gradient(135deg, ${color}15, ${color}05)`,
                                    border: `2px solid ${color}30`
                                }}
                            >
                                <h3 className="heading-3 mb-3" style={{ color: color }}>
                                    Pronto para começar?
                                </h3>
                                <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
                                    Acesse o serviço agora e explore todos os recursos disponíveis.
                                </p>
                                {internal ? (
                                    <Link
                                        href={url}
                                        className="btn btn-primary w-full flex items-center justify-center gap-2"
                                        style={{ background: color }}
                                    >
                                        Acessar {title}
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                ) : (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary w-full flex items-center justify-center gap-2"
                                        style={{ background: color }}
                                    >
                                        Acessar {title}
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Outros Serviços */}
            <section className="py-16" style={{ background: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
                <div className="container-custom">
                    <h2 className="heading-2 mb-8 text-center">Outros Serviços</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {servicesData
                            .filter(s => s.id !== serviceId)
                            .slice(0, 3)
                            .map((otherService) => {
                                const OtherIcon = (Icons as any)[otherService.icon];
                                return (
                                    <Link
                                        key={otherService.id}
                                        href={`/servicos/${otherService.slug}`}
                                        className="card p-6 group hover:shadow-lg transition-all"
                                        style={{ borderLeft: `4px solid ${otherService.color}` }}
                                    >
                                        <div
                                            className="mb-4 p-3 w-fit rounded-lg"
                                            style={{ background: `${otherService.color}15`, color: otherService.color }}
                                        >
                                            {OtherIcon && <OtherIcon className="w-6 h-6" />}
                                        </div>
                                        <h3 className="heading-3 mb-2">{otherService.title}</h3>
                                        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                                            {otherService.shortDescription.slice(0, 100)}...
                                        </p>
                                    </Link>
                                );
                            })}
                    </div>
                </div>
            </section>
        </div>
    );
}
