# 🎯 SOLUÇÃO RÁPIDA - Carousel com Botões

## 📝 Código Completo para Copiar

Cole este código **ENTRE AS LINHAS 167-195** do arquivo `src/app/page.tsx`:

```tsx
            {/* Services Logos Carousel com Botões de Navegação */}
            <div className="mb-12">
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--muted-foreground)' }}>
                SERVIÇOS INTEGRADOS
              </p>
              
              <div style={{ position: 'relative' }}>
                {/* Botão Anterior (Esquerda) */}
                <button
                  onClick={handlePrev}
                  style={{
                    position: 'absolute',
                    left: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--django-green-primary)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(68, 183, 139, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--django-green-link)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--django-green-primary)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  }}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Carousel Container */}
                <div 
                  style={{
                    width: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                    maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
                  }}
                >
                  <div 
                    ref={carouselRef}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '2rem',
                      padding: '1rem 0',
                      animation: 'scroll-logos-infinite 40s linear infinite',
                      willChange: 'transform'
                    }}
                  >
                    {/* Primeira cópia dos logos */}
                    {services.map((service, index) => (
                      <a
                        key={`logo-${index}`}
                        href={service.url}
                        target={service.internal ? "_self" : "_blank"}
                        rel={service.internal ? undefined : "noopener noreferrer"}
                        title={service.title}
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
                      </a>
                    ))}
                    
                    {/* Segunda cópia para loop infinito */}
                    {services.map((service, index) => (
                      <a
                        key={`logo-duplicate-${index}`}
                        href={service.url}
                        target={service.internal ? "_self" : "_blank"}
                        rel={service.internal ? undefined : "noopener noreferrer"}
                        title={service.title}
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
                      </a>
                    ))}
                  </div>
                </div>

                {/* Botão Próximo (Direita) */}
                <button
                  onClick={handleNext}
                  style={{
                    position: 'absolute',
                    right: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--django-green-primary)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(68, 183, 139, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--django-green-link)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--django-green-primary)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  }}
                  aria-label="Próximo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
```

---

## ✅ Checklist Rápido

Certifique-se que  tem:

1. **Linha 5**: Import dos ícones
```tsx
import { ..., ChevronLeft, ChevronRight } from 'lucide-react';
```

2. **Linhas ~103-128**: Funções de controle
```tsx
const carouselRef = useRef<HTMLDivElement>(null);

const handlePrev = () => { ... };
const handleNext = () => { ... };
```

3. **Linhas 167-195**: Substitua o carousel antigo pelo código acima

---

## 🎨 Como Ficou

```
     ←  [Logo1] [Logo2] [Logo3] [Logo4]...  →
        ↑                                   ↑
   Botão Prev                          Botão Next
   
   - Verde Django
   - Hover = Aumenta + Escurece
   - Click = Acelera animação
```

---

## 🚀 Como Funciona

**Botão ← (Prev):**
- Acelera animação para esquerda por 1 segundo
- Depois volta ao normal

**Botão → (Next):**
- Acelera animação para direita por 1 segundo
- Depois volta ao normal

---

Se preferir, posso criar o arquivo completo para você!

Digite **"arquivo completo"** e eu crio o page.tsx inteiro pronto para copiar.
