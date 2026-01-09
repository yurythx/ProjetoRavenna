# 📦 Guia Completo de Configuração do MinIO

Este documento explica como o MinIO está configurado no ProjetoRavenna e como gerenciá-lo, incluindo configurações de segurança, CORS e integração com Next.js.

## 📋 Visão Geral

O MinIO é usado como armazenamento de objetos (S3-compatible) para:
- **Imagens de artigos** (banners, uploads)
- **Arquivos de mídia** gerados pelo sistema
- **Backups** (futuro)

## 🏗️ Arquitetura

```
┌─────────────┐
│   Django    │ ──► MinIO (S3 API) ──► Bucket: projetoravenna
│   Backend   │      http://minio:9002
└─────────────┘
                     │
                     ▼
              Cloudflare Tunnel (ou localhost)
                     │
                     ▼
         https://minio.projetoravenna.cloud
         (ou http://localhost:9002 em dev)
```

## ⚙️ Configuração

### Variáveis de Ambiente (`.env`)

Configure estas variáveis no arquivo `.env` na raiz do projeto:

```env
# MinIO Credentials
MINIO_ROOT_USER=minioadmin                    # Username do MinIO
MINIO_ROOT_PASSWORD=sua_senha_forte_aqui      # Senha do MinIO (OBRIGATÓRIO)
MINIO_BUCKET_NAME=projetoravenna              # Nome do bucket (padrão: projetoravenna)

# MinIO URLs
MINIO_ENDPOINT_URL=http://minio:9002          # URL interna (usada pelo backend)
MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud # Domínio público (usado nas URLs geradas)
MINIO_PUBLIC_DOMAIN_URL=https://minio.projetoravenna.cloud # URL completa para redirects/CORS

# Security & CORS
CORS_ALLOWED_ORIGINS=https://projetoravenna.cloud,https://www.projetoravenna.cloud,http://localhost:3000
```

### Como Funciona

1. **Docker Compose**:
   - **API S3**: Porta interna `9002` (Mapeada para `9002` no host)
   - **Console Web**: Porta interna `9003` (Mapeada para `9003` no host)
2. **Django Storage**: Usa `django-storages` com backend S3 para salvar arquivos.
3. **URLs Públicas**: Arquivos são acessíveis via `https://minio.projetoravenna.cloud/projetoravenna/...`
4. **Cloudflare Tunnel**: Faz proxy HTTPS do MinIO para o domínio público.

## � Segurança e CORS

### Configuração de CORS

O MinIO está configurado para permitir Cross-Origin Resource Sharing (CORS) apenas de origens confiáveis. Isso é definido nas variáveis de ambiente do serviço `minio` no `docker-compose.yml`:

```yaml
environment:
  MINIO_API_CORS_ALLOW_ORIGIN: "${CORS_ALLOWED_ORIGINS}"
  MINIO_BROWSER_REDIRECT_URL: "${MINIO_PUBLIC_DOMAIN_URL}"
```

Isso impede que sites de terceiros consumam a banda do seu bucket via requisições diretas (hotlinking via AJAX/Fetch).

### Permissões do Bucket

O bucket é criado automaticamente com política de **leitura pública** (`download`) para que as imagens possam ser exibidas no site sem autenticação para cada requisição.

- ✅ **Leitura**: Pública (Anonymous)
- ❌ **Escrita**: Privada (Requer credenciais do Django)

## 🔧 Configuração no Django

O Django está configurado em `backend/config/settings.py` para usar MinIO quando `USE_MINIO=True`:

```python
if USE_MINIO:
    AWS_S3_ENDPOINT_URL = config('MINIO_ENDPOINT_URL', default='http://minio:9002')
    MINIO_PUBLIC_DOMAIN = config('MINIO_PUBLIC_DOMAIN', default='localhost:9002')
    AWS_S3_CUSTOM_DOMAIN = MINIO_PUBLIC_DOMAIN
    # ...
```

## 🖥️ Configuração no Next.js (Frontend)

Para que o componente `<Image />` do Next.js consiga otimizar as imagens vindas do MinIO, é necessário configurar os domínios permitidos em `frontend/next.config.ts`.

A configuração atual suporta tanto **Produção** quanto **Desenvolvimento Local**:

```typescript
images: {
  remotePatterns: [
    // Desenvolvimento Local (MinIO na porta 9002)
    { protocol: 'http', hostname: 'localhost', port: '9002' },
    { protocol: 'http', hostname: '127.0.0.1', port: '9002' },
    
    // Produção
    { protocol: 'https', hostname: 'minio.projetoravenna.cloud' },
  ],
  // ...
}
```

Isso permite que você rode o projeto localmente com imagens apontando para `localhost:9002` e, em produção, elas apontem para `minio.projetoravenna.cloud` sem precisar alterar o código.

## 🚀 Deploy Automático e Setup

O serviço `createbuckets` no `docker-compose.yml` roda automaticamente na inicialização para:
1. Criar o bucket se não existir.
2. Definir a política de acesso como `download` (público).

Você não precisa rodar comandos manuais, a menos que queira resetar ou inspecionar.

## 📝 Comandos Úteis

### Acessar Console do MinIO
- **URL**: `http://localhost:9003`
- **Login**: Use as credenciais do `.env`

### Listar arquivos (via Docker)
```bash
docker-compose exec minio mc ls myminio/projetoravenna --recursive
```

### Upload Manual
```bash
docker-compose exec minio mc cp arquivo.jpg myminio/projetoravenna/articles/banners/
```

### Teste de Diagnóstico
O projeto inclui um script para verificar toda a configuração:
```bash
./diagnose_minio.sh
```

## 🌐 Cloudflare Tunnel

Se estiver usando Cloudflare Tunnel, certifique-se de configurar o serviço para a porta **9002**:

```
Hostname: minio.projetoravenna.cloud
Service:  http://minio:9002
```

## 🎯 Checklist de Verificação

- [ ] Variáveis `MINIO_ROOT_USER`, `PASSWORD` e `BUCKET_NAME` no `.env`
- [ ] `MINIO_ENDPOINT_URL` apontando para `http://minio:9002`
- [ ] `CORS_ALLOWED_ORIGINS` configurado com domínios do frontend
- [ ] Bucket criado e com permissão pública (verificado via `mc anonymous get`)
- [ ] `next.config.ts` inclui `minio.projetoravenna.cloud` e `localhost:9002`
- [ ] Imagens carregam no frontend sem erros 403 (CORS) ou 404 (Not Found)
