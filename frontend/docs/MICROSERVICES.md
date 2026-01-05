# Homepage de Microserviços - Documentação

## 🎯 Visão Geral

A homepage foi transformada em um **portal unificado de microserviços**, mantendo o **Design System Django** (paleta verde) e integrando todos os serviços do ecossistema digital.

---

## 🎨 Design System Mantido

### Cores Django Utilizadas
- **Verde Principal**: `var(--django-green-primary)` - `#44B78B`
- **Verde Escuro**: `var(--django-green-dark)` - `#0C4B33`
- **Verde Link**: `var(--django-green-link)` - `#20AA76`

### Cores dos Serviços
Cada serviço tem uma cor única para identificação visual:

| Serviço | Cor | Código |
|---------|-----|--------|
| **Artigos** | Verde Django | `#44B78B` |
| **Jellyfin** | Roxo | `#AA5CC3` |
| **Komga** | Laranja | `#F97316` |
| **Evolution** | Verde | `#10B981` |
| **Chatwoot** | Ciano | `#06B6D4` |
| **n8n** | Amarelo | `#F59E0B` |

---

## 📦 Serviços Integrados

### 1. **Artigos & Blog** (Interno)
- **Rota**: `/artigos`
- **Descrição**: Sistema completo de gestão de conteúdo Django
- **Features**: Categorias, tags, rich text editor, publicação
- **Badge**: "Módulo Django"
- **Tecnologia**: Django + Next.js

### 2. **Jellyfin** (Externo)
- **URL**: Configurável via env
- **Descrição**: Streaming de mídia (Netflix self-hosted)
- **Features**: Filmes, séries, músicas
- **Tecnologia**: Jellyfin Server

### 3. **Komga** (Externo)
- **URL**: Configurável via env
- **Descrição**: Servidor de eBooks e quadrinhos
- **Features**: Leitura online, organização
- **Tecnologia**: Komga Server

### 4. **Evolution API** (Externo)
- **URL**: Configurável via env
- **Descrição**: API para automação WhatsApp
- **Features**: Multi-instâncias, webhooks
- **Tecnologia**: Node.js + Baileys

### 5. **Chatwoot** (Externo)
- **URL**: Configurável via env
- **Descrição**: Central de atendimento
- **Features**: Multicanal, tickets, chatbots
- **Tecnologia**: Ruby on Rails

### 6. **n8n** (Externo)
- **URL**: Configurável via env
- **Descrição**: Workflow automation
- **Features**: No-code, integrações
- **Tecnologia**: Node.js

---

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto frontend:

```bash
# Frontend/.env.local

# URLs dos Microserviços
NEXT_PUBLIC_URL_JELLYFIN=https://jellyfin.seudominio.com
NEXT_PUBLIC_URL_KOMGA=https://komga.seudominio.com
NEXT_PUBLIC_URL_EVOLUTION=https://evolution.seudominio.com
NEXT_PUBLIC_URL_CHATWOOT=https://chatwoot.seudominio.com
NEXT_PUBLIC_URL_N8N=https://n8n.seudominio.com

# API Backend Django
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Valores Padrão
Se as variáveis não estiverem definidas, URLs de exemplo serão usadas:
- `https://jellyfin.seudominio.com`
- `https://komga.seudominio.com`
- etc.

---

## 🏗️ Estrutura da Homepage

### Hero Section
```tsx
- Badge "Ecossistema Digital Unificado"
- Título principal com destaque verde Django
- Descrição do ecossistema
- 2 CTAs: "Explorar Artigos" e "Ver Serviços"
- Elementos decorativos (blobs) com gradiente verde
```

### Services Grid
```tsx
- Grid responsivo (1/2/3 colunas)
- Cards com:
  - Ícone colorido
  - Título + Badge (se aplicável)
  - Descrição detalhada
  - Link com ícone (ArrowRight ou ExternalLink)
  - Borda lateral colorida
  - Hover effects suaves
```

### Architecture Section
```tsx
- Estatísticas em destaque:
  - 6 Serviços Ativos
  - 100% Auto-hospedado
  - 24/7 Disponibilidade
- Background com var(--muted)
```

### Footer
```tsx
- Copyright dinâmico com ano atual
- Mensagem: "Todos os serviços operacionais e integrados"
```

---

## 🎯 Características Técnicas

### Responsividade
- **Mobile** (< 768px): 1 coluna
- **Tablet** (768px - 1024px): 2 colunas
- **Desktop** (> 1024px): 3 colunas

### Acessibilidade
- ✅ Links externos com `rel="noopener noreferrer"`
- ✅ Ícones semânticos (ExternalLink vs ArrowRight)
- ✅ Contraste adequado WCAG AA
- ✅ Transições suaves (300ms)

### Performance
- ✅ CSS-in-JS mínimo (inline styles)
- ✅ Variáveis CSS do Design System
- ✅ Sem dependências extras
- ✅ Otimização de bundle

### SEO
- ✅ Semantic HTML (`<section>`, `<footer>`)
- ✅ Heading hierarchy (h1 → h2 → h3)
- ✅ Links descritivos
- ✅ Metadata estruturado

---

## 🚀 Como Usar

### Desenvolvimento Local

1. **Configure as variáveis de ambiente**:
```bash
cd frontend
cp .env.example .env.local  # Se existir
# Edite .env.local com suas URLs
```

2. **Rode o servidor**:
```bash
npm run dev
```

3. **Acesse**:
```
http://localhost:3000
```

### Build de Produção

```bash
npm run build
npm run start
```

---

## 🎨 Customização

### Adicionar Novo Serviço

Edite `src/app/page.tsx`:

```tsx
const services = [
  // ... serviços existentes
  {
    title: "Novo Serviço",
    description: "Descrição detalhada do serviço",
    url: process.env.NEXT_PUBLIC_URL_NOVO || "https://default.com",
    icon: <IconComponent className="w-8 h-8" />,
    internal: false, // ou true se for rota interna
    badge: "Opcional", // ou undefined
    color: "#HEX_COLOR"
  }
];
```

### Alterar Cores

As cores seguem o tema Django. Para alterar:

1. **Cor do serviço**: Edite o campo `color` no array
2. **Cor principal**: Use `var(--django-green-primary)`
3. **Cores do tema**: Edite `globals.css`

### Alterar Textos

Todos os textos são hardcoded para facilidade. Busque e substitua:
- Hero title: `"Meu Ecossistema Digital"`
- Hero description: Linha 84-85
- Section titles: `"Serviços Integrados"`, etc.

---

## 📊 Métricas e Analytics

### Recomendações

1. **Google Analytics**: Adicionar tracking de cliques externos
2. **Vercel Analytics**: Monitorar performance
3. **Plausible**: Alternativa privacy-first

### Eventos Sugeridos

```tsx
// Exemplo com Google Analytics
const handleServiceClick = (serviceName: string) => {
  gtag('event', 'service_click', {
    service_name: serviceName,
    external: !service.internal
  });
};
```

---

## 🔒 Segurança

### Links Externos
- ✅ `target="_blank"` para evitar tab takeover
- ✅ `rel="noopener noreferrer"` para prevenir exploits

### Environment Variables
- ✅ Prefixo `NEXT_PUBLIC_` para variáveis públicas
- ✅ Nunca commitir `.env.local` (gitignored)
- ✅ Usar URLs HTTPS em produção

---

## 🐛 Troubleshooting

### Problema: URLs não aparecem
**Solução**: Verifique se criou o `.env.local` e reiniciou o servidor.

### Problema: Cores não aplicam
**Solução**: Certifique-se que `globals.css` tem as variáveis Django definidas.

### Problema: Ícones não aparecem
**Solução**: Verifique se `lucide-react` está instalado:
```bash
npm install lucide-react
```

---

## 📚 Próximas Melhorias

### Curto Prazo
- [ ] Adicionar status health check dos serviços
- [ ] Implementar modo offline indicator
- [ ] Adicionar tooltips explicativos

### Médio Prazo
- [ ] Dashboard com métricas de uso
- [ ] Sistema de notificações
- [ ] Busca global entre serviços

### Longo Prazo
- [ ] Single Sign-On (SSO) entre serviços
- [ ] API Gateway centralizado
- [ ] Monitoramento unificado (Grafana)

---

## 🤝 Integração com Backend

### Possíveis Endpoints Django

```python
# Future API endpoints
GET /api/v1/services/        # Lista serviços ativos
GET /api/v1/services/health/ # Health check de todos
POST /api/v1/services/toggle # Ativar/desativar serviço
```

### Exemplo de Resposta

```json
{
  "services": [
    {
      "id": "jellyfin",
      "name": "Jellyfin",
      "url": "https://jellyfin.example.com",
      "status": "online",
      "uptime": 99.9
    }
  ]
}
```

---

## 📄 Licença e Créditos

- **Design System**: Baseado em Django (djangoproject.com)
- **Ícones**: Lucide React (lucide.dev)
- **Framework**: Next.js 16
- **Autor**: Seu Nome

---

**Desenvolvido com 💚 usando o Design System Django**
