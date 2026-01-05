## Objetivo
Estabelecer uma base de Frontend modular em Next.js (App Router) alinhada ao backend Django/DRF, com geração automática de tipos via OpenAPI, camada de serviço (Axios) consciente de módulos, hooks com React Query e páginas por domínio.

## Estrutura de Pastas
- src/app: rotas e layouts por domínio (ex.: /blog)
- src/components: UI compartilhada (ex.: ArticleCard)
- src/contexts: AuthContext e ModuleContext
- src/hooks: hooks por domínio (ex.: useArticles)
- src/lib: clientes e utilitários (api.ts, queryClient.ts)
- src/types: tipos gerados do OpenAPI (api.ts)
- Opcional para escalar: src/modules/<domínio> agrupando components/hooks/context do módulo

## Dependências e Tipagem
- Instalar: axios, @tanstack/react-query, lucide-react, openapi-typescript
- Adicionar script no [package.json](file:///c:/Users/allle/OneDrive/Área%20de%20Trabalho/Projetos/articles/frontend/package.json):

```json
{
  "scripts": {
    "api:gen": "npx openapi-typescript ../backend/schema.yaml -o ./src/types/api.ts"
  }
}
```

- Gerar tipos a partir de [schema.yaml](file:///c:/Users/allle/OneDrive/Área%20de%20Trabalho/Projetos/articles/backend/schema.yaml):

```bash
npm run api:gen
```

## Cliente de API (Axios) com Inteligência de Módulo
- Criar src/lib/api.ts para baseURL, token via Cookie e tratamento de erros (403 module_disabled, 401, etc.).

```ts
// src/lib/api.ts
import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({ baseURL });

function getTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  const token = getTokenFromCookie();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    if (status === 403 && code === 'module_disabled') {
      // Sinalizar para UI (ModuleContext) que o módulo está desativado
      console.error('Módulo desativado administrativamente');
    }
    if (status === 401) {
      // Opcional: acionar fluxo de logout/refresh
      console.warn('Não autenticado');
    }
    return Promise.reject(error);
  }
);
```

## Provider Global (React Query + Contexts)
- Adicionar Providers para habilitar React Query e AuthContext.

```tsx
// src/app/providers.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
```

- Envolver o layout raiz com Providers:

```tsx
// src/app/layout.tsx
import Providers from './providers';
// ...
<body className={classes}>
  <Providers>{children}</Providers>
</body>
```

## AuthContext (JWT em Cookie)
- Gerenciar login, logout e token em Cookie; expor estado e ações.

```tsx
// src/contexts/AuthContext.tsx
'use client';
import { createContext, useContext, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type AuthState = { token: string | null; loading: boolean; };

type AuthContextType = {
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function setCookie(name: string, value: string, days = 7) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
}
function deleteCookie(name: string) { document.cookie = `${name}=; Max-Age=0; path=/`; }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, loading: false });

  async function login(username: string, password: string) {
    setState((s) => ({ ...s, loading: true }));
    const { data } = await api.post('/auth/token/', { username, password });
    setCookie('auth_token', data.access);
    setState({ token: data.access, loading: false });
  }

  function logout() {
    deleteCookie('auth_token');
    setState({ token: null, loading: false });
  }

  const value = useMemo(() => ({ ...state, login, logout }), [state.token, state.loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

## Hooks Sincronizados com Selectors
- Implementar useArticles consumindo /api/v1/articles/posts/ com cache.

```ts
// src/hooks/useArticles.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { components } from '@/types/api';

type Article = components['schemas']['Article'];

export function useArticles(params?: Record<string, unknown>) {
  return useQuery<Article[]>({
    queryKey: ['articles', params],
    queryFn: async () => {
      const { data } = await api.get('/articles/posts/', { params });
      return data;
    },
  });
}
```

## Componentes de UI
- ArticleCard com Image otimizado.

```tsx
// src/components/ArticleCard.tsx
import Image from 'next/image';
import { components } from '@/types/api';

type Article = components['schemas']['Article'];

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="space-y-3">
      <Image
        src={article.banner}
        alt={article.title}
        width={600}
        height={315}
        className="object-cover rounded-lg"
      />
      <h3 className="text-xl font-semibold">{article.title}</h3>
    </article>
  );
}
```

## Página de Blog
- Nova rota /blog usando o hook.

```tsx
// src/app/blog/page.tsx
'use client';
import { useArticles } from '@/hooks/useArticles';
import { ArticleCard } from '@/components/ArticleCard';

export default function BlogPage() {
  const { data, isLoading, error } = useArticles({ is_published: true });
  if (isLoading) return <p>Carregando…</p>;
  if (error) return <p>Falha ao carregar artigos</p>;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {data?.map((a) => (
        <ArticleCard key={a.slug} article={a} />
      ))}
    </div>
  );
}
```

## Tratamento de Módulo Desativado
- Centralizar sinalização em ModuleContext (futuro), reagir ao 403/code module_disabled do interceptor.
- UI pode exibir Toast/Alert e/ou fallback de rota.

## Configuração de Ambiente
- NEXT_PUBLIC_API_URL: "http://localhost:8000/api/v1" em .env.local para desenvolvimento.
- JWT endpoints disponíveis conforme [urls.py](file:///c:/Users/allle/OneDrive/Área%20de%20Trabalho/Projetos/articles/backend/config/urls.py#L12-L19).

## Padrões e Convenções
- Query Keys: prefixo por domínio (ex.: ['articles', params]).
- Tipos: preferir components['schemas'][…] gerados pelo OpenAPI.
- Segurança: sem log de tokens; cookies com path=/; evitar expor secrets.

## Próximos Passos (após aprovação)
- Instalar dependências e adicionar script api:gen.
- Implementar arquivos api.ts, providers.tsx, AuthContext, useArticles, ArticleCard, blog/page.tsx.
- Rodar geração de tipos e validar fluxo de listagem com backend.
