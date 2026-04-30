# Documentação do Frontend (Next.js)

O portal do jogador é uma aplicação **Next.js 15** moderna, focada em performance e experiência do usuário (UX) de alta qualidade.

---

## 🎨 Design System
*   **Tailwind CSS**: Estilização via utilitários.
*   **Framer Motion**: Micro-animações e transições fluidas.
*   **Glassmorphism**: Uso intensivo de transparências e blurs para um visual "premium gamer".

---

## 📂 Estrutura de Pastas

### `src/app/` (Rotas)
*   `me/`: **Player Hub**. Dashboard cinemático com status (HP/MP/Stats), inventário e leaderboard.
*   `forum/`: Sistema de comunidade com navegação por categorias.
*   `blog/`: Portal de notícias integrado ao backend.
*   `login/` / `register/`: Fluxos de autenticação protegidos.

### `src/features/` (Módulos)
Cada feature agrupa seus próprios componentes, hooks e lógica.
*   **`game/`**:
    *   `hooks/use-player-data.ts`: Hook central para buscar dados do personagem.
    *   `components/PlayerStatsCard.tsx`: Card animado de atributos.
    *   `components/InventoryCard.tsx`: Grade de itens visual.

### `src/lib/`
*   `axios.ts`: Cliente de API configurado com o prefixo `/api/v1/` e suporte a tokens JWT.
*   `query-provider.tsx`: Configuração do **TanStack Query** para gerenciamento de cache e atualizações otimistas.

---

## 🚀 Otimizações
*   **Server Components (RSC)**: As páginas de blog e fórum são renderizadas no servidor para SEO e velocidade.
*   **Client Hooks**: Dados voláteis do jogo (XP/Gold) são buscados no lado do cliente para permitir atualizações em tempo real sem recarregar a página.
