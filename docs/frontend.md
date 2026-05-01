# Frontend — Next.js Portal

Interface web do jogador construída com **Next.js 15**, focada em performance, SEO e UX de alta qualidade.

---

## Stack

| Componente | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Estilização | Tailwind CSS v4 |
| Estado servidor | TanStack Query v5 (React Query) |
| HTTP | Axios (instância com base `/api/v1/`) |
| Formulários | React Hook Form + Zod |
| Animações | Framer Motion |
| Editor de texto | TipTap |
| Testes | Vitest + Testing Library |

---

## Páginas (`src/app/`)

### Públicas

| Rota | Descrição |
|---|---|
| `/` | Landing page — hero, features, CTA |
| `/login` | Autenticação com JWT |
| `/register` | Registro de conta |
| `/forgot-password` | Solicitação de reset via OTP |
| `/reset-password` | Confirmação com código OTP |
| `/verify-email` | Verificação de e-mail |
| `/blog` | Portal de notícias com lista de posts |
| `/blog/[slug]` | Post completo com comentários |
| `/forum` | Lista de tópicos recentes |
| `/forum/c/[slug]` | Categoria do fórum |
| `/forum/t/[slug]` | Tópico com replies e reações |
| `/forum/new` | Criar novo tópico |
| `/game-data/items` | Catálogo de itens com filtros (raridade, tipo, nível, busca) |
| `/game-data/quests` | Catálogo de missões agrupadas por tipo, com objetivos e recompensas |
| `/leaderboard` | Ranking global — podium top-3, lista completa, highlight do jogador atual |

### Autenticadas

| Rota | Descrição |
|---|---|
| `/me` | **Player Hub** — stats, inventário, leaderboard card, info de sessão |

### Dashboard Admin

| Rota | Acesso | Descrição |
|---|---|---|
| `/dashboard` | staff/editor/mod | Visão geral com cards de métricas |
| `/dashboard/usuarios` | Admin | Gerenciar usuários e permissões |
| `/dashboard/blog` | Editor | Gerenciar posts (criar, editar, publicar) |
| `/dashboard/forum/moderation` | Moderador | Fila de moderação do fórum |
| `/dashboard/auditoria` | Admin | Log de auditoria de ações administrativas |
| `/dashboard/configuracoes/email` | Admin | Configuração de SMTP |
| `/dashboard/configuracoes/diagnosticos` | Admin | Diagnóstico de saúde dos serviços |

---

## Arquitetura de Dados

### `src/lib/axios.ts`
Instância Axios com `baseURL = ${NEXT_PUBLIC_API_BASE_URL}/api/v1`. Em dev, aponta para `http://localhost:8000/api/v1`. Em produção, exige `NEXT_PUBLIC_API_BASE_URL`.

### `src/lib/fetch.ts`
Wrapper `jsonFetch` para Next.js Server Components (não usa Axios). Usado em SSR para SEO (blog, fórum).

### `src/features/game/`
Hook central `usePlayerData` e componentes de UI para dados do jogador:
- `PlayerStatsCard` — atributos, nível, XP, pontos restantes
- `PlayerInventoryCard` — grade de itens por slot
- `LeaderboardCard` — top-10 compacto, embutido no Player Hub

---

## Variáveis de Ambiente

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000   # backend URL (visível no browser)
NEXT_PUBLIC_SITE_URL=http://localhost:3000       # URL pública do frontend
```

Em desenvolvimento, `NEXT_PUBLIC_API_BASE_URL` é opcional — o fallback é `http://localhost:8000`.

---

## Design System

Todas as classes customizadas seguem o prefixo `rv-`:

| Classe | Uso |
|---|---|
| `rv-card` | Card com borda, fundo semi-transparente e hover |
| `rv-btn`, `rv-btn-primary`, `rv-btn-ghost` | Botões com variantes |
| `rv-badge`, `rv-badge-purple`, `rv-badge-cyan` | Badges coloridos |
| `rv-display` | Fonte display (títulos) |
| `rv-label` | Texto label em caps/tracking |
| `rv-orb` | Elemento de glow ambiental circular |
| `rv-glow-purple` | Shadow glow violeta |
| `rv-divider` | Divisor horizontal com gradiente |

Cores principais (`globals.css`): `--rv-accent` (violeta), `--rv-cyan`, `--rv-gold`, `--rv-red`.

---

## Testes

```bash
cd frontend
npm test          # vitest run (19 testes atualmente)
npm run test:watch  # modo watch
npx tsc --noEmit    # type check
```

Testes cobrem: auth provider, blog comments, forum reactions, reply composer, moderação e sanitização de HTML.

---

## Scripts

```bash
npm run dev      # servidor de desenvolvimento (porta 3000)
npm run build    # build de produção
npm run start    # inicia build de produção
npm run lint     # ESLint
```
