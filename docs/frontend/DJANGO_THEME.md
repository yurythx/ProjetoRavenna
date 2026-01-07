# Django-Inspired Theme System

## 🎨 Paleta de Cores Django

Implementamos a paleta de cores oficial do site Django (https://www.djangoproject.com/) com suporte completo a temas claro e escuro.

### 🌈 Cores da Marca Django

```css
--django-green-primary: #44B78B  /* Verde principal para CTAs */
--django-green-dark: #0C4B33     /* Verde escuro do header */
--django-green-link: #20AA76     /* Verde para links */
```

### ☀️ Modo Claro (Light Mode)

```css
--background: #F8F8F8            /* Fundo off-white suave */
--foreground: #0C3C26            /* Texto verde escuro */
--muted: #E8E8E8                 /* Fundos secundários */
--muted-foreground: #5A6C57      /* Texto secundário */
--border: #D4D4D4                /* Bordas */
--accent: #44B78B                /* Cor de destaque */
--card-bg: #FFFFFF               /* Fundo dos cards */
--header-bg: #0C4B33             /* Verde escuro do header */
--header-text: #FFFFFF           /* Texto do header */
```

### 🌙 Modo Escuro (Dark Mode)

```css
--background: #181D27            /* Fundo marinho escuro */
--foreground: #C1CAD2            /* Texto cinza azulado claro */
--muted: #252B37                 /* Fundos secundários */
--muted-foreground: #8B95A1      /* Texto secundário */
--border: #3A4453                /* Bordas */
--accent: #44B78B                /* Verde Django (mantém em dark) */
--card-bg: #1E2430               /* Fundo dos cards */
--header-bg: #0C4B33             /* Verde Django (mantém) */
--header-text: #FFFFFF           /* Texto branco */
```

## 🔤 Tipografia

### Fonte Principal
```css
--font-sans: 'Roboto', Corbel, Avenir, "Lucida Grande", "Lucida Sans", sans-serif
```

Usamos a **Roboto** como fonte principal, exatamente como o site do Django, com fallbacks para fontes sans-serif de alta qualidade.

## 🌓 Sistema de Temas

### Como Funciona

O sistema de temas suporta 3 modos:

1. **Auto** (padrão): Segue a preferência do sistema
2. **Light**: Força modo claro
3. **Dark**: Força modo escuro

### Implementação Técnica

#### ThemeProvider (`src/contexts/ThemeContext.tsx`)

```typescript
- Gerencia o estado do tema (auto/light/dark)
- Persiste a escolha no localStorage
- Detecta mudanças na preferência do sistema
- Aplica o atributo data-theme no <html>
```

#### ThemeToggle (`src/components/ThemeToggle.tsx`)

```typescript
- Botão cíclico que alterna entre os 3 estados
- Ícones: Monitor (auto), Sun (light), Moon (dark)
- Integrado no Header
- Acessível com aria-labels
```

#### CSS Global (`src/app/globals.css`)

```css
/* Modo padrão (light) */
:root { ... }

/* Dark mode explícito */
[data-theme="dark"] { ... }

/* Dark mode automático */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { ... }
}
```

### Transições Suaves

```css
/* Transição global */
* {
  transition-property: background-color, border-color, color;
  transition-duration: 200ms;
}

/* Desabilita transições durante mudança de tema */
html.changing-theme * {
  transition: none !important;
}
```

## 🎯 Como Usar

### Consumir o Tema

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  // theme: 'auto' | 'light' | 'dark' (preferência do usuário)
  // resolvedTheme: 'light' | 'dark' (tema efetivo aplicado)
  
  return (
    <button onClick={() => setTheme('dark')}>
      Dark Mode
    </button>
  );
}
```

### Usar Variáveis CSS

```tsx
// Em JSX
<div style={{ background: 'var(--accent)' }}>...</div>

// Em CSS/Tailwind
<div className="text-foreground bg-background">...</div>
```

## 🛠️ Componentes Atualizados

### Header
- ✅ Fundo verde escuro Django (`--header-bg`)
- ✅ Texto branco (`--header-text`)
- ✅ ThemeToggle integrado
- ✅ Funciona em mobile e desktop

### ArticleCard
- ✅ Fundo adapta ao tema (`--card-bg`)
- ✅ Bordas ajustam (`--border`)
- ✅ Texto legível em ambos os temas

### Botões
- ✅ `btn-primary`: Verde Django
- ✅ `btn-outline`: Bordas adaptam ao tema
- ✅ Hover states consistentes

### Inputs
- ✅ Backgrounds adaptam
- ✅ Focus state com verde Django
- ✅ Texto legível

## 📱 Responsividade

O tema funciona perfeitamente em:
- ✅ Desktop
- ✅ Tablet
- ✅ Mobile
- ✅ Sistema operacional (auto mode)

## ♿ Acessibilidade

### Contraste (WCAG AA)
- ✅ Light mode: Contraste adequado
- ✅ Dark mode: Contraste adequado
- ✅ Links destacados
- ✅ Focus states visíveis

### Navegação
- ✅ Keyboard navigation
- ✅ Screen reader friendly
- ✅ Aria labels no ThemeToggle

## 🎨 Paleta Comparada

| Elemento | Django Original | Nossa Implementação |
|----------|----------------|---------------------|
| Header BG | `#0C4B33` | `#0C4B33` ✅ |
| Primary Green | `#44B78B` | `#44B78B` ✅ |
| Link Green | `#20AA76` | `#20AA76` ✅ |
| Light BG | `#F8F8F8` | `#F8F8F8` ✅ |
| Dark BG | `#181D27` | `#181D27` ✅ |
| Dark Text | `#C1CAD2` | `#C1CAD2` ✅ |
| Font | Roboto | Roboto ✅ |

## 🚀 Performance

### Otimizações
- ✅ CSS puro (sem overhead de JS)
- ✅ Transições suaves mas rápidas (200ms)
- ✅ LocalStorage para persistência
- ✅ Detecção automática de sistema

### Bundle Size
- ThemeContext: ~2KB
- ThemeToggle: ~1KB
- CSS adicional: Mínimo

## 📝 Próximos Passos

### Melhorias Futuras
1. **Temas Customizáveis**: Permitir usuário criar paleta própria
2. **High Contrast Mode**: Para acessibilidade
3. **Redução de Movimento**: Respeitar `prefers-reduced-motion`
4. **Color Scheme Meta Tag**: Para navegadores

### Exemplo de Uso Avançado

```tsx
// Componente com tema personalizado
function CustomThemedComponent() {
  const { resolvedTheme } = useTheme();
  
  return (
    <div style={{
      background: resolvedTheme === 'dark' 
        ? 'var(--card-bg)' 
        : 'var(--muted)',
      color: 'var(--foreground)'
    }}>
      Content adapts to theme
    </div>
  );
}
```

## 📚 Referências

- [Django Website](https://www.djangoproject.com/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

---

**Desenvolvido seguindo fielmente o design system do Django! 🐍💚**
