
# Guia de Deploy com Docker (aaPanel + Cloudflare Tunnel)

Este guia descreve como colocar sua aplicação Backend (Django) e Frontend (Next.js) rodando em containers Docker no seu servidor Ubuntu.

## 1. Preparação dos Arquivos

Certifique-se de que os seguintes arquivos criados/editados recentemente estão no seu projeto:
- `docker-compose.yml` (na raiz)
- `backend/Dockerfile`
- `backend/entrypoint.sh`
- `frontend/Dockerfile`
- `frontend/next.config.ts` (com `output: 'standalone'`)

## 2. Configuração de Variáveis de Ambiente

### Backend
No servidor, dentro da pasta `backend`, você encontrará o arquivo `.env.production`.
1. Renomeie-o para `.env`: `mv .env.production .env`
2. Edite-o para definir sua `SECRET_KEY`.

```bash
cd backend
mv .env.production .env
nano .env
```

```env
SECRET_KEY=gere-uma-chave-secreta-nova
DEBUG=False
# As demais variaveis de dominio sao injetadas pelo docker-compose, mas você pode sobrescreve-las aqui se necessário.
```

### Frontend
O Next.js já está configurado no `docker-compose.yml` para apontar para `https://api.projetoravenna.cloud/api/v1`.
Não é necessário configuração adicional se os domínios forem esses.

## 3. Subindo a Aplicação no Servidor

1. **Upload**: Envie a pasta do projeto para o servidor (ex: `/www/wwwroot/projetoravenna`).
2. **Permissões**:
   ```bash
   chmod +x backend/entrypoint.sh
   ```
3. **Build e Run**:
   ```bash
   docker-compose up -d --build
   ```

## 4. Pós-Instalação

### Criar Superuser do Django
```bash
docker-compose exec backend python manage.py createsuperuser
```

### Verificar Logs
```bash
docker-compose logs -f
```

## 5. Configuração do Cloudflare Tunnel

Certifique-se de que seus túneis apontem para as portas locais do servidor:

1. **Frontend (`projetoravenna.cloud`)** -> `http://localhost:3001`
2. **Backend/API (`api.projetoravenna.cloud`)** -> `http://localhost:8000`

**Importante**:
Como o SSL é gerenciado pelo Cloudflare, a aplicação interna roda em HTTP (portas 3001 e 8000), mas o `CORS_ALLOWED_ORIGINS` e `CSRF` estão configurados para esperar chamadas vindas de `https://`. Isso já foi ajustado nos arquivos de configuração.
