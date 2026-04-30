# Documentação de Infraestrutura e Deploy

Este documento detalha como os serviços se conectam e como gerenciar o ambiente.

---

## 🏗️ Stack de Serviços
*   **PostgreSQL 16**: Banco de dados relacional persistente.
*   **Redis 7**: Cache, Filas (Celery) e Rankings em tempo real.
*   **Celery**: Processamento de tarefas em background (e-mails, limpeza de logs).
*   **Nginx (Produção)**: Proxy reverso e terminação SSL.

---

## 🔑 Gestão de Chaves (RSA)
O projeto utiliza criptografia de chave pública/privada para autenticação entre serviços.
*   `keys/private.pem`: Usada pelo Backend para assinar tokens.
*   `keys/public.pem`: Usada pelo GameServer para verificar tokens.

**IMPORTANTE**: Nunca compartilhe a chave privada. O GameServer precisa apenas da pública.

---

## 🐳 Docker Orquestração

### Ambiente de Desenvolvimento
Executado via `Backend/docker-compose.yml`. Foca em subir apenas as dependências (DB/Redis) para permitir o desenvolvimento local.

### Ambiente de Produção
Executado via `docker-compose.prod.yml` na raiz.
*   Inclui monitoramento.
*   Configura volumes persistentes para mídia e banco de dados.
*   Gerencia o reinício automático de containers.

---

## 📡 Comunicação (Protobuf)
As definições em `proto/game_messages.proto` devem ser sincronizadas entre:
1.  **GameServer**: Compila para C#.
2.  **Unity Client**: Compila para C#.
3.  **Backend** (Opcional): Se houver necessidade de processar payloads binários.
