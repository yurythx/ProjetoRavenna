# 📋 Implementação do Catálogo de Serviços

## ✅ O QUE FOI CRIADO

### 1. **Arquivo de Dados Centralizado**
`src/data/services.ts` - Dados de todos os 11 serviços

### 2. **Páginas Dinâmicas dos Serviços**
`src/app/servicos/[slug]/page.tsx` - Template para cada serviço

## 🔄 O QUE PRECISA SER ATUALIZADO

### **Arquivo: `src/app/page.tsx`**

Você precisa fazer as seguintes alterações:

#### **1. Remover imports desnecessários**
```diff
- import { ChevronLeft, ChevronRight } from 'lucide-react';
+ // Removidos ChevronLeft e ChevronRight
```

#### **2. Importar dados centralizados**
```tsx
import { servicesData } from '@/data/services';
```

#### **3. Usar servicesData em vez do array local**
```tsx
// Remover todo o const services = [...]

// Mapear para o formato que o carousel precisa
const services = servicesData.map(s => ({
  title: s.title,
  description: s.shortDescription,
  url: s.url,
  slug: s.slug,  // IMPORTANTE: Adicionar slug
  icon: getIconComponent(s.icon),
  internal: s.internal,
  badge: s.badge,
  color: s.color
}));

// Helper para pegar ícone
function getIconComponent(iconName: string) {
  const icons: any = { BookOpen, Film, Library, MessageCircle, Zap, Cpu, Cloud, Activity, TicketCheck, Server, Container };
  const Icon = icons[iconName];
  return Icon ? <Icon className="w-8 h-8" /> : null;
}
```

#### **4. Remover todo o código dos botões**
No carousel (linhas ~200-250):

**REMOVER:**
```tsx
{/* Botão Anterior */}
<button onClick={handlePrev} ...>
  <ChevronLeft />
</button>

{/* Botão Próximo */}
<button onClick={handleNext} ...>
  <ChevronRight />
</button>
```

#### **5. Atualizar links do carousel**
```tsx
{/* Nos logos do carousel */}
<Link  // Mudar de <a> para <Link>
  href={`/servicos/${service.slug}`}  // Link para página do serviço
  title={service.title}
  className="logo-item"
  style={{...}}
>
  {service.icon}
  <span>{service.title}</span>
</Link>
```

#### **6. Adicionar botão "Sobre o Serviço" nos cards**
Na seção de serviços (grid de cards), adicionar:

```tsx
<div className="flex items-center gap-3">
  <a
    href={service.url}
    target={service.internal ? "_self" : "_blank"}
    className="flex items-center text-sm font-semibold"
    style={{ color: service.color }}
  >
    {service.internal ? 'Acessar módulo' : 'Abrir serviço'}
    {service.internal ? <ArrowRight /> : <ExternalLink />}
  </a>
  
  <span style={{ color: 'var(--border)' }}>|</span>
  
  <Link
    href={`/servicos/${service.slug}`}
    className="flex items-center text-sm font-semibold"
    style={{ color: 'var(--django-green-primary)' }}
  >
    Sobre o serviço
    <ArrowRight className="w-4 h-4 ml-1" />
  </Link>
</div>
```

---

## 🎯 RESULTADO FINAL

### **Carousel (Sem Botões)**
- ✅ Animação automática suave
- ✅ Clique no logo → `/servicos/[slug]`
- ✅ Loop infinito

### **Cards de Serviços**
Cada card terá 2 links:
1. **"Abrir serviço"** → Acessa o serviço externo
2. **"Sobre o serviço"** → Vai para `/servicos/[slug]`

### **Páginas Individuais**
Cada serviço tem sua própria página em `/servicos/[slug]` com:
- Descrição completa
- Lista de recursos
- Tecnologias utilizadas
- Categoria
- CTA para acessar o serviço
- Links para outros serviços

---

## 📁 ROTAS CRIADAS

```
/servicos/artigos
/servicos/jellyfin
/servicos/komga
/servicos/evolution-api
/servicos/chatwoot
/servicos/n8n
/servicos/nextcloud
/servicos/glpi
/servicos/zabbix
/servicos/aapanel
/servicos/portainer
```

---

## 🚀 PRÓXIMOS PASSOS

Vou criar agora o arquivo page.tsx completo atualizado para você.

Digite **"criar"** e eu gero o arquivo final pronto!
