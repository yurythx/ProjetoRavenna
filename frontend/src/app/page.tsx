'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Film, Library, MessageCircle, Zap, Cpu, ArrowRight, Sparkles, ExternalLink, Cloud, Activity, TicketCheck, Server, Container, ShoppingCart } from 'lucide-react';
import { servicesData } from '@/data/services';

export default function Home() {
  // Helper para pegar componente de ícone
  function getIconComponent(iconName: string) {
    const icons: any = {
      BookOpen, Film, Library, MessageCircle, Zap, Cpu,
      Cloud, Activity, TicketCheck, Server, Container, ShoppingCart
    };
    const Icon = icons[iconName];
    return Icon ? <Icon className="w-8 h-8" /> : null;
  }

  // Mapear dados centralizados para formato do carousel
  const services = servicesData.map(s => ({
    title: s.title,
    description: s.fullDescription,
    url: s.url,
    slug: s.slug,
    icon: getIconComponent(s.icon),
    internal: s.internal,
    badge: s.badge,
    color: s.color
  }));

  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll suave
  useEffect(() => {
    const startAutoScroll = () => {
      scrollIntervalRef.current = setInterval(() => {
        if (carouselRef.current) {
          const container = carouselRef.current;
          const maxScroll = container.scrollWidth / 2;

          if (container.scrollLeft >= maxScroll - 1) {
            container.scrollLeft = 0;
          } else {
            container.scrollLeft += 1;
          }
        }
      }, 30);
    };

    startAutoScroll();

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        .carousel-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .carousel-container::-webkit-scrollbar {
          display: none;
        }
        
        .logo-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      <div className="min-h-screen">
        <section
          className="relative py-20 lg:py-32 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--background) 0%, var(--muted) 50%, var(--background) 100%)' }}
        >
          <div className="container-custom">
            <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">

              {/* Carousel APENAS com Animação */}
              <div className="mb-12">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--muted-foreground)' }}>
                  SERVIÇOS INTEGRADOS
                </p>

                <div
                  ref={carouselRef}
                  className="carousel-container"
                  style={{
                    width: '100%',
                    overflowX: 'scroll',
                    overflowY: 'hidden',
                    scrollBehavior: 'auto',
                    maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '2rem',
                      padding: '1rem 0',
                      width: 'max-content'
                    }}
                  >
                    {/* Primeira cópia */}
                    {services.map((service, index) => (
                      <Link
                        key={`logo-${index}`}
                        href={`/servicos/${service.slug}`}
                        title={service.title}
                        className="logo-item"
                        style={{
                          color: service.color,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          minWidth: '100px',
                          maxWidth: '100px',
                          flexShrink: 0,
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          userSelect: 'none'
                        }}
                        onDragStart={(e) => e.preventDefault()}
                      >
                        <div style={{ pointerEvents: 'none' }}>
                          {service.icon}
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}>{service.title}</span>
                      </Link>
                    ))}

                    {/* Segunda cópia para loop infinito */}
                    {services.map((service, index) => (
                      <Link
                        key={`logo-duplicate-${index}`}
                        href={`/servicos/${service.slug}`}
                        title={service.title}
                        className="logo-item"
                        style={{
                          color: service.color,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          minWidth: '100px',
                          maxWidth: '100px',
                          flexShrink: 0,
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          userSelect: 'none'
                        }}
                        onDragStart={(e) => e.preventDefault()}
                      >
                        <div style={{ pointerEvents: 'none' }}>
                          {service.icon}
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}>{service.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--django-green-primary)', color: 'white' }}>
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Infraestrutura Profissional</span>
              </div>

              <h1 className="heading-1 max-w-3xl mx-auto">
                Projeto <span style={{ color: 'var(--django-green-primary)' }}>Ravenna</span>
              </h1>

              <div className="text-xl font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                projetoravenna.cloud
              </div>

              <p className="body-large max-w-2xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
                Ecossistema completo de gestão e serviços digitais integrados,
                rodando em containers Docker com máxima segurança e escalabilidade.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-3xl mx-auto">
                <div className="p-6 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                  <div className="text-5xl font-bold mb-2" style={{ color: 'var(--django-green-primary)' }}>12</div>
                  <div className="font-semibold text-lg">Serviços Ativos</div>
                </div>
                <div className="p-6 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                  <div className="text-5xl font-bold mb-2" style={{ color: 'var(--django-green-primary)' }}>100%</div>
                  <div className="font-semibold text-lg">Auto-hospedado</div>
                </div>
                <div className="p-6 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                  <div className="text-5xl font-bold mb-2" style={{ color: 'var(--django-green-primary)' }}>24/7</div>
                  <div className="font-semibold text-lg">Disponibilidade</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <Link href="/artigos" className="btn btn-primary flex items-center gap-2 px-8 py-3 text-base">
                  Explorar Artigos
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#servicos" className="btn btn-outline flex items-center gap-2 px-8 py-3 text-base">
                  Ver Serviços
                </a>
              </div>
            </div>
          </div>

          <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--django-green-primary)' }} />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--django-green-link)' }} />
        </section>

        {/* Services Grid */}
        <section id="servicos" className="py-20">
          <div className="container-custom">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="heading-2">Serviços Integrados</h2>
                <p className="body-large mt-2" style={{ color: 'var(--muted-foreground)' }}>
                  Acesse suas ferramentas prontas e rodando em containers
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="card group p-8 flex flex-col h-full transition-all duration-300"
                  style={{ borderLeft: `4px solid ${service.color}` }}
                >
                  <div className="mb-6 p-3 w-fit rounded-lg transition-all duration-300" style={{ background: 'var(--muted)', color: service.color }}>
                    {service.icon}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="heading-3 mb-0">{service.title}</h3>
                    {service.badge && (
                      <span className="badge text-[10px] px-2 py-1 rounded-full font-semibold" style={{ background: 'var(--django-green-primary)', color: 'white' }}>
                        {service.badge}
                      </span>
                    )}
                  </div>

                  <p className="flex-grow mb-6 leading-relaxed" style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                    {service.description.slice(0, 200)}...
                  </p>

                  {/* Dois Links: Acessar Serviço + Sobre o Serviço */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href={service.url}
                      target={service.internal ? "_self" : "_blank"}
                      rel={service.internal ? undefined : "noopener noreferrer"}
                      className="flex items-center text-sm font-semibold hover:underline transition-all"
                      style={{ color: service.color }}
                    >
                      {service.internal ? 'Acessar módulo' : 'Abrir serviço'}
                      {service.internal ? (
                        <ArrowRight className="w-4 h-4 ml-1" />
                      ) : (
                        <ExternalLink className="w-4 h-4 ml-1" />
                      )}
                    </a>

                    <span style={{ color: 'var(--border)' }}>|</span>

                    <Link
                      href={`/servicos/${service.slug}`}
                      className="flex items-center text-sm font-semibold hover:underline transition-all"
                      style={{ color: 'var(--django-green-primary)' }}
                    >
                      Sobre o serviço
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="py-12 text-center" style={{ borderTop: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
          <p className="text-sm">© {new Date().getFullYear()} - Todos os serviços operacionais e integrados</p>
        </footer>
      </div>
    </>
  );
}
