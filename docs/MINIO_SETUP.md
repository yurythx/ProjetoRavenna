# 📦 Guia Completo de Configuração do MinIO

Este documento explica como o MinIO está configurado no ProjetoRavenna e como gerenciá-lo.

## 📋 Visão Geral

O MinIO é usado como armazenamento de objetos (S3-compatible) para:
- **Imagens de artigos** (banners, uploads)
- **Arquivos de mídia** gerados pelo sistema
- **Backups** (futuro)

## 🏗️ Arquitetura

```
┌─────────────┐
│   Django    │ ──► MinIO (S3 API) ──► Bucket: projetoravenna
│   Backend   │      http://minio:9000
└─────────────┘
                     │
                     ▼
              Cloudflare Tunnel
                     │
                     ▼
         https://minio.projetoravenna.cloud
```

## ⚙️ Configuração

### Variáveis de Ambiente

Configure no arquivo `.env` na raiz do projeto:

```env
# MinIO Credentials
MINIO_ROOT_USER=minioadmin                    # Username do MinIO
MINIO_ROOT_PASSWORD=sua_senha_forte_aqui      # Senha do MinIO (OBRIGATÓRIO)
MINIO_BUCKET_NAME=projetoravenna              # Nome do bucket (padrão: projetoravenna)

# MinIO Public Domain (para acesso via HTTPS)
MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud # Domínio público do MinIO
```

### Como Funciona

1. **Docker Compose**: O MinIO roda como container na porta interna `9000`
2. **Django Storage**: Usa `django-storages` com backend S3 para salvar arquivos
3. **URLs Públicas**: Arquivos são acessíveis via `https://minio.projetoravenna.cloud/projetoravenna/...`
4. **Cloudflare Tunnel**: Faz proxy HTTPS do MinIO para o domínio público

## 🔧 Configuração no Django

O Django está configurado em `backend/config/settings.py`:

```python
# Quando USE_MINIO=True:
DEFAULT_FILE_STORAGE = 'apps.core.storage.MinIOStorage'
AWS_STORAGE_BUCKET_NAME = 'projetoravenna'
AWS_S3_ENDPOINT_URL = 'http://minio:9000'  # Interno (Docker network)
AWS_S3_CUSTOM_DOMAIN = 'minio.projetoravenna.cloud/projetoravenna'  # Público
```

### Por que duas URLs?

- **Interna** (`http://minio:9000`): Django usa para salvar arquivos (dentro da rede Docker)
- **Pública** (`https://minio.projetoravenna.cloud`): Navegadores usam para carregar imagens (via Cloudflare)

## 🚀 Deploy Automático

O script `deploy.sh` cria automaticamente o bucket e configura permissões:

```bash
# O script executa automaticamente:
docker-compose exec minio mc mb myminio/projetoravenna
docker-compose exec minio mc anonymous set download myminio/projetoravenna
```

## 🧪 Testar Configuração

### Comando de Teste do Django

O projeto inclui um comando de management para testar a configuração do MinIO:

```bash
# Teste básico (verifica configurações e conexão)
docker-compose exec backend python manage.py test_minio

# Teste completo (inclui verificação de bucket e upload)
docker-compose exec backend python manage.py test_minio --check-bucket --test-upload

# Modo verbose (mostra informações detalhadas)
docker-compose exec backend python manage.py test_minio --verbose
```

O comando verifica:
- ✅ Se MinIO está habilitado
- ✅ Se todas as configurações estão presentes
- ✅ Se a conexão com MinIO funciona
- ✅ Se o bucket existe e tem permissões corretas
- ✅ Se upload e geração de URL funcionam

## 📝 Comandos Úteis

### Acessar Console do MinIO

```bash
# Localmente (via porta exposta)
http://localhost:9003

# Login com credenciais do .env
```

### Listar arquivos no bucket

```bash
docker-compose exec minio mc ls myminio/projetoravenna --recursive
```

### Fazer upload manual

```bash
docker-compose exec minio mc cp arquivo.jpg myminio/projetoravenna/articles/banners/
```

### Verificar permissões do bucket

```bash
docker-compose exec minio mc anonymous get myminio/projetoravenna
```

### Configurar permissões públicas (se necessário)

```bash
docker-compose exec minio mc anonymous set download myminio/projetoravenna
```

### Remover arquivo

```bash
docker-compose exec minio mc rm myminio/projetoravenna/path/to/file.jpg
```

### Estatísticas do bucket

```bash
docker-compose exec minio mc du myminio/projetoravenna
```

## 🔒 Segurança

### Permissões do Bucket

O bucket está configurado com permissão **pública de leitura** (`download`):
- ✅ Qualquer um pode **ler** arquivos (necessário para servir imagens)
- ❌ Apenas autenticados podem **escrever** (via Django)

### Credenciais

- **Nunca** commite o arquivo `.env` no Git
- Use senhas fortes para `MINIO_ROOT_PASSWORD`
- Em produção, considere usar IAM policies do MinIO para controle granular

## 🌐 Cloudflare Tunnel

### Configuração Necessária

O Cloudflare Tunnel precisa ter uma rota configurada:

```
Hostname: minio.projetoravenna.cloud
Service:  http://minio:9000
```

**Importante**: O container do Cloudflare precisa estar na rede `projetoravenna_network`:

```bash
docker network connect projetoravenna_network cloudflared
```

### Verificar Configuração

```bash
# Verificar se Cloudflare está na rede correta
docker inspect cloudflared | grep projetoravenna_network

# Ver logs do Cloudflare
docker logs cloudflared
```

## 🔍 Diagnóstico

### Script de Diagnóstico Automático

Execute o script de diagnóstico para verificar todas as configurações:

```bash
./diagnose_minio.sh
```

O script verifica:
- ✅ Containers Docker (MinIO, Backend, Frontend)
- ✅ Configurações do MinIO
- ✅ Conectividade interna
- ✅ Bucket e permissões
- ✅ Configurações do Django
- ✅ Cloudflare Tunnel
- ✅ Acesso público
- ✅ Geração de URLs

### Comando Django de Teste

Para testes mais detalhados, use o comando de management:

```bash
docker-compose exec backend python manage.py test_minio --check-bucket --test-upload --verbose
```

## 🐛 Troubleshooting

### Problema: Imagens não carregam (502 Bad Gateway)

**Causa**: Cloudflare Tunnel não configurado ou bucket sem permissões públicas.

**Solução**:
1. Verifique se o Cloudflare Tunnel tem a rota para `minio.projetoravenna.cloud`
2. Verifique permissões: `docker-compose exec minio mc anonymous get myminio/projetoravenna`
3. Execute o script de diagnóstico: `./diagnose_minio.sh`

### Problema: URLs apontam para api.projetoravenna.cloud

**Causa**: `MINIO_PUBLIC_DOMAIN` não configurado ou Django não está usando MinIO.

**Solução**:
1. Verifique `.env`: `MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud`
2. Verifique `USE_MINIO=True` no docker-compose.yml
3. Reinicie o backend: `docker-compose restart backend`

### Problema: Erro ao fazer upload

**Causa**: Credenciais incorretas ou MinIO não acessível.

**Solução**:
1. Verifique credenciais no `.env`
2. Verifique se MinIO está rodando: `docker-compose ps minio`
3. Verifique logs: `docker-compose logs minio`

### Problema: Bucket não existe

**Causa**: Deploy não executou a criação automática do bucket.

**Solução**:
```bash
docker-compose exec minio mc mb myminio/projetoravenna
docker-compose exec minio mc anonymous set download myminio/projetoravenna
```

## 📊 Monitoramento

### Ver uso de espaço

```bash
docker-compose exec minio mc du myminio/projetoravenna
```

### Ver logs do MinIO

```bash
docker-compose logs -f minio
```

### Health Check

O MinIO tem health check configurado no Docker Compose. Verifique:

```bash
docker-compose ps minio
```

## 🔄 Backup

### Backup do bucket (futuro)

```bash
# Criar backup do bucket
docker-compose exec minio mc mirror myminio/projetoravenna /backup/minio/

# Restaurar backup
docker-compose exec minio mc mirror /backup/minio/ myminio/projetoravenna
```

## 📚 Referências

- [Documentação MinIO](https://min.io/docs/)
- [django-storages S3](https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

## 🎯 Checklist de Configuração

- [ ] Variáveis `MINIO_ROOT_USER` e `MINIO_ROOT_PASSWORD` configuradas no `.env`
- [ ] `MINIO_PUBLIC_DOMAIN` configurado no `.env`
- [ ] Bucket criado e com permissões públicas
- [ ] Cloudflare Tunnel configurado para `minio.projetoravenna.cloud`
- [ ] Cloudflare na rede `projetoravenna_network`
- [ ] Comando `test_minio` passa sem erros
- [ ] Script `diagnose_minio.sh` mostra tudo OK
- [ ] Teste de upload funcionando
- [ ] URLs geradas apontam para `minio.projetoravenna.cloud`
- [ ] Imagens carregam corretamente no frontend
