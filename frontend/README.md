# ProjetoRavenna - Frontend

Aplicação Next.js 15 com App Router, TypeScript e TailwindCSS.

## 🚀 Quick Start

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Configurar Ambiente**:
   Crie um arquivo `.env.local` (veja [ENV_SETUP.md](../docs/frontend/ENV_SETUP.md) para detalhes):
   ```bash
   cp .env.example .env.local
   ```

3. **Rodar servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

Acesse [http://localhost:3001](http://localhost:3001).

## 📚 Documentação (Pasta `../docs/frontend`)

- **[README.md](../docs/frontend/README.md)**: Índice geral e Tech Stack.
- **[ENV_SETUP.md](../docs/frontend/ENV_SETUP.md)**: Guia de variáveis de ambiente e microserviços.
- **[MICROSERVICES.md](../docs/frontend/MICROSERVICES.md)**: Arquitetura do Portal de Serviços.
- **[FEATURES.md](../docs/frontend/FEATURES.md)**: Detalhes de Comentários, Captcha e outras features.

## 🏗️ Build de Produção

```bash
npm run build
npm run start
```

## 🐳 Docker

Este projeto inclui um `Dockerfile` otimizado para produção (standalone output).
Veja `../root/docker-compose.yml` para orquestração.
