# Projeto Ravenna - Game Ecosystem

Bem-vindo ao **Projeto Ravenna**, um ecossistema completo para jogos multiplayer integrado à Unity. Este projeto combina alta performance em tempo real com uma infraestrutura robusta de persistência e comunidade.

---

## 📚 Documentação Detalhada

Para facilitar a navegação, a documentação foi separada por módulos:

*   🚀 **[Guia de Início Rápido](./docs/infrastructure.md)**: Como subir o ambiente e gerenciar a infraestrutura.
*   🐍 **[Backend & API](./docs/backend.md)**: Detalhes sobre a lógica Django, Banco de Dados e Segurança.
*   ⚛️ **[Portal do Jogador](./docs/frontend.md)**: Tudo sobre a interface Next.js e o Dashboard.
*   🎮 **[Game Server](./docs/gameserver.md)**: Análise técnica do servidor autoritativo em C#.
*   🛡️ **[Arquitetura & Segurança](./ARCHITECTURE.md)**: Fluxo de dados e medidas anti-cheat.

---

## 🛠️ Tecnologias Principais
*   **Backend**: Django, DRF, PostgreSQL, Redis, Celery.
*   **Frontend**: Next.js 15, Tailwind CSS, TanStack Query.
*   **Game Server**: .NET 8 (C#), KCP (Reliable UDP), Protobuf.

---

## 📂 Visão Geral da Estrutura
*   `Backend/`: Core da aplicação (API).
*   `frontend/`: Interface Web do Jogador.
*   `gameserver/`: Servidor autoritativo para Unity.
*   `proto/`: Definições de mensagens binárias.
*   `docs/`: Documentação técnica detalhada.

---
© 2026 Projeto Ravenna. Desenvolvido para alta performance e escalabilidade.
