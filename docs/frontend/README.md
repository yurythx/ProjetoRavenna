# Documentação Frontend (Next.js)

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: TailwindCSS + CSS Variables (Design System Django)
- **Ícones**: Lucide React
- **Dados**: Static Data em `src/data` (sem CMS externo para estrutura core)

## 📚 Guias Disponíveis

- **[ENV_SETUP.md](ENV_SETUP.md)**: Guia completo de variáveis de ambiente e URLs de microserviços.
- **[MICROSERVICES.md](MICROSERVICES.md)**: Explicação arquitetural do Portal de Serviços Unificado.

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── app/                 # App Router Pages
│   │   ├── page.tsx         # Homepage (Portal)
│   │   ├── layout.tsx       # Root Layout (Fontes, Metadata)
│   │   ├── artigos/         # Módulo de Blog
│   │   │   ├── [slug]/      # Artigo Single
│   │   │   ├── editor/      # Editor WYSIWYG
│   │   │   └── new/         # Novo Artigo
│   │   └── servicos/
│   │       └── [slug]/      # Página Dinâmica de Serviço
│   ├── components/          # Componentes Reutilizáveis
│   │   ├── ui/              # Buttons, Cards, Inputs
│   │   └── layout/          # Header, Sidebar
│   ├── data/
│   │   └── services.ts      # Catálogo Central de Serviços (MinIO, Jellyfin, etc)
│   └── config/              # Configurações globais
└── public/                  # Assets estáticos
```

## 🚀 Rotas Principais

- `/` - **Portal de Serviços** (Lista todos os microserviços)
- `/artigos` - **Blog/CMS** (Módulo interno principal)
- `/servicos/[slug]` - **Detalhes** (Página explicativa de cada serviço)
- `/auth/*` - **Autenticação** (Login/Register)

## 🎨 Design System

O projeto usa variáveis CSS nativas para cores, inspiradas no tema Django:

- `--django-green-primary`: #44B78B
- `--django-green-dark`: #0C4B33
- `--background`: #FFFFFF (Light) / #09090b (Dark)

Consulte `src/app/globals.css` para todas as variáveis.
