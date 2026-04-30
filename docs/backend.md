# Documentação do Backend (Django)

O backend do Projeto Ravenna é construído com **Django 5.0** e **Django Rest Framework**, focado em ser o "Single Source of Truth" (Fonte Única da Verdade) para os dados do jogo.

---

## 📂 Estrutura de Pastas

### `core/`
Contém o coração do projeto:
*   `settings.py`: Configurações de segurança, DB (Postgres), Cache (Redis), JWT (RS256) e Tarefas (Celery).
*   `urls.py`: Roteamento global. Centraliza as APIs em `/api/v1/`.
*   `celery.py`: Orquestração de tarefas assíncronas (ex: processamento de estatísticas).

### `apps/` (Módulos)

#### 🛡️ `accounts/`
Gerenciamento de identidade e segurança.
*   **Custom User Model**: Usa UUID como chave primária.
*   **HWID Tracking**: Vincula o hardware do jogador à conta para controle de multi-contas.
*   **Audit Log**: Registra todas as ações administrativas (banimentos, mudanças de e-mail).
*   **Permissions**: Middlewares que garantem que apenas usuários verificados e não-banidos acessem a API de jogo.

#### 🎮 `game_logic/`
Toda a mecânica de persistência do jogo.
*   **Inventory & Items**: Processa a coleta e uso de itens. Usa `select_for_update()` para garantir que itens não sejam duplicados em requisições paralelas.
*   **Experience & Levels**: Lógica de progressão e distribuição de pontos de atributo.
*   **Leaderboard**: Sincroniza o ranking global com o Redis para leitura instantânea no site.

#### 💬 `forum/` & `blog/`
*   **Forum**: Sistema completo com tópicos fixados, reações, busca avançada e contadores de respostas atômicos.
*   **Blog**: Portal de notícias editorial com controle de visibilidade (rascunhos vs publicados).

---

## 🔐 Segurança
*   **RS256 JWT**: O backend assina tokens usando uma chave privada RSA. Isso permite que o GameServer valide a autenticidade do jogador de forma descentralizada.
*   **Throttling**: Limitação de taxa de requisições configurada para prevenir ataques de força bruta e DoS.
