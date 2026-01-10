# 🔴 PROBLEMA CRÍTICO: Duplo HTTPS em URLs do MinIO

**Data:** 2026-01-10  
**Problema:** Imagens retornando 403 Forbidden com URL `https://https://minio...`  
**Causa Raiz:** `MINIO_PUBLIC_DOMAIN` com `https://` quando Django já adiciona automaticamente  
**Status:** ✅ RESOLVIDO

---

## 🔍 Sintomas do Problema

### Erro no Navegador
```
GET https://projetoravenna.cloud/api/img?url=https%3A%2F%2Fhttps%3A%2F%2Fminio.projetoravenna.cloud/...
403 Forbidden
```

### URL Gerada (Incorreta)
```
https://https://minio.projetoravenna.cloud/projetoravenna/articles/banners/image.webp
         ^^^^^^^^ DUPLO PROTOCOLO!
```

---

## 🎯 Causa Raiz

### O Problema

O Django (`settings.py` linhas 158-164) adiciona **automaticamente** `https://` quando NÃO é localhost:

```python
# settings.py
if 'localhost' in MINIO_PUBLIC_DOMAIN or '127.0.0.1' in MINIO_PUBLIC_DOMAIN:
    AWS_S3_URL_PROTOCOL = 'http:'
else:
    AWS_S3_URL_PROTOCOL = 'https:'  # ← Django ADICIONA https://
```

Se você configurar `MINIO_PUBLIC_DOMAIN` **com `https://`**, o resultado é:

```
Django adiciona: https://
Domínio já tem:  https://minio.projetoravenna.cloud
Resultado:       https://https://minio.projetoravenna.cloud  ❌
```

---

## ✅ Solução

### 1. Configuração Correta do `.env`

**❌ ERRADO (causa duplo https://):**
```env
MINIO_PUBLIC_DOMAIN=https://minio.projetoravenna.cloud
```

**✅ CORRETO (sem protocolo):**
```env
MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud
```

### 2. Configuração Correta do `docker-compose.yml`

**❌ ERRADO:**
```yaml
environment:
  - MINIO_PUBLIC_DOMAIN=https://minio.projetoravenna.cloud
```

**✅ CORRETO:**
```yaml
environment:
  - MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud
```

### 3. Configuração Correta do `.env.example`

**✅ Template Correto:**
```env
# MinIO Object Storage Configuration
USE_MINIO=True
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin_secure_password_change_this
MINIO_BUCKET_NAME=projetoravenna
# Domínio público (SEM protocolo - Django adiciona automaticamente)
# Desenvolvimento: localhost:9000
# Produção: minio.projetoravenna.cloud
MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud
# URL interna (usada pelo backend dentro do Docker)
MINIO_ENDPOINT_URL=http://minio:9000
```

---

## 🔧 Como o Django Monta as URLs

### Fluxo Correto

```
1. MINIO_PUBLIC_DOMAIN (do .env ou docker-compose):
   → minio.projetoravenna.cloud

2. Django detecta que não é localhost (settings.py linha 159-164):
   → AWS_S3_URL_PROTOCOL = 'https:'

3. Django monta AWS_S3_CUSTOM_DOMAIN (settings.py linha 169):
   → minio.projetoravenna.cloud/projetoravenna

4. django-storages adiciona protocolo:
   → https://minio.projetoravenna.cloud/projetoravenna

5. URL final do arquivo:
   → https://minio.projetoravenna.cloud/projetoravenna/articles/banners/image.webp ✅
```

### Fluxo Incorreto (com https:// no config)

```
1. MINIO_PUBLIC_DOMAIN (ERRADO):
   → https://minio.projetoravenna.cloud

2. Django detecta que não é localhost:
   → AWS_S3_URL_PROTOCOL = 'https:'

3. Django monta AWS_S3_CUSTOM_DOMAIN:
   → https://minio.projetoravenna.cloud/projetoravenna

4. django-storages adiciona protocolo de novo:
   → https://https://minio.projetoravenna.cloud/projetoravenna

5. URL final do arquivo:
   → https://https://minio.projetoravenna.cloud/projetoravenna/articles/banners/image.webp ❌
```

---

## 🔍 Como Diagnosticar

### 1. Verificar Configurações Atuais

```bash
# Ver o que está no .env
cat .env | grep MINIO_PUBLIC_DOMAIN

# Ver o que está no docker-compose.yml
cat docker-compose.yml | grep -A 2 "MINIO_PUBLIC_DOMAIN"

# Ver o que o Django está lendo
docker compose exec backend python manage.py shell -c "
from django.conf import settings
print('MINIO_PUBLIC_DOMAIN:', settings.MINIO_PUBLIC_DOMAIN)
print('AWS_S3_CUSTOM_DOMAIN:', settings.AWS_S3_CUSTOM_DOMAIN)
print('AWS_S3_URL_PROTOCOL:', settings.AWS_S3_URL_PROTOCOL)
"
```

### 2. Verificar URLs Geradas

```bash
docker compose exec backend python manage.py shell -c "
from apps.articles.models import Article
a = Article.objects.exclude(banner='').first()
if a and a.banner:
    print('Banner no DB:', a.banner)
    print('URL gerada:', a.banner.url)
"
```

**Esperado:**
```
Banner no DB: articles/banners/image.webp
URL gerada: https://minio.projetoravenna.cloud/projetoravenna/articles/banners/image.webp
```

**Incorreto:**
```
Banner no DB: articles/banners/image.webp
URL gerada: https://https://minio.projetoravenna.cloud/projetoravenna/articles/banners/image.webp
              ^^^^^^^^ DUPLO!
```

---

## 🚀 Solução Passo a Passo

### Se Você Encontrar Este Problema

#### 1. Verificar Configuração

```bash
cd /home/suporte/ProjetoRavenna

# Verificar .env
cat .env | grep MINIO_PUBLIC_DOMAIN
# DEVE MOSTRAR: MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud (SEM https://)

# Verificar docker-compose.yml
cat docker-compose.yml | grep -A 2 "MINIO_PUBLIC_DOMAIN"
# DEVE MOSTRAR: - MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud (SEM https://)
```

#### 2. Corrigir se Necessário

**Se `.env` tiver `https://`:**
```bash
nano .env
# Mudar de: MINIO_PUBLIC_DOMAIN=https://minio.projetoravenna.cloud
# Para:     MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud
```

**Se `docker-compose.yml` tiver `https://`:**
```bash
git pull origin main  # Pegar versão corrigida
```

#### 3. Aplicar Correção

```bash
# Parar e reiniciar tudo
docker compose down
docker compose up -d

# Aguardar
sleep 30
```

#### 4. Verificar Correção

```bash
docker compose exec backend python manage.py shell -c "
from django.conf import settings
print('MINIO_PUBLIC_DOMAIN:', settings.MINIO_PUBLIC_DOMAIN)
from apps.articles.models import Article
a = Article.objects.exclude(banner='').first()
if a and a.banner:
    print('URL gerada:', a.banner.url)
"
```

**Deve mostrar:**
```
MINIO_PUBLIC_DOMAIN: minio.projetoravenna.cloud
URL gerada: https://minio.projetoravenna.cloud/projetoravenna/articles/banners/...
```

**SEM `https://https://`**!

#### 5. Limpar Cache do Navegador

1. Pressione `Ctrl + Shift + Delete`
2. Limpe cache e imagens
3. **OU** abra aba anônima (Ctrl+Shift+N)
4. **OU** force reload (Ctrl+F5)

---

## ⚠️ Pontos Importantes

### 1. Docker Compose Sobrescreve .env

Se houver `MINIO_PUBLIC_DOMAIN` **hardcoded** no `docker-compose.yml`, ele **sobrescreve** o valor do `.env`.

**Ordem de prioridade:**
1. Variáveis em `docker-compose.yml` (environment:)
2. Variáveis em `.env`
3. Valores padrão no código

### 2. Django Adiciona Protocolo Automaticamente

**NUNCA** adicione `https://` ou `http://` no `MINIO_PUBLIC_DOMAIN`.

O Django decide baseado no domínio:
- `localhost` ou `127.0.0.1` → usa `http://`
- Qualquer outro domínio → usa `https://`

### 3. Reinício é Obrigatório

Após mudar `.env` ou `docker-compose.yml`:

```bash
# Restart simples (se só mudou .env)
docker compose restart backend

# Restart completo (se mudou docker-compose.yml)
docker compose down
docker compose up -d
```

---

## 📋 Checklist de Verificação

Antes de fazer deploy, verifique:

- [ ] `.env` tem `MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud` (SEM https://)
- [ ] `docker-compose.yml` tem `MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud` (SEM https://)
- [ ] `.env.example` está atualizado como referência
- [ ] Cloudflare Tunnel configurado para `minio.projetoravenna.cloud`
- [ ] Testado com `python manage.py shell` para ver URL gerada
- [ ] URLs das imagens **não** têm `https://https://`
- [ ] Cache do navegador limpo para testar

---

## 🔧 Comando de Diagnóstico Rápido

Execute este comando para verificar tudo de uma vez:

```bash
#!/bin/bash
echo "🔍 Diagnóstico MinIO - MINIO_PUBLIC_DOMAIN"
echo "=========================================="
echo ""

echo "📄 1. Valor no .env:"
grep MINIO_PUBLIC_DOMAIN .env

echo ""
echo "📄 2. Valor no docker-compose.yml:"
grep "MINIO_PUBLIC_DOMAIN" docker-compose.yml

echo ""
echo "🐳 3. Valor que o Django está lendo:"
docker compose exec backend python manage.py shell -c "
from django.conf import settings
print('MINIO_PUBLIC_DOMAIN:', settings.MINIO_PUBLIC_DOMAIN)
print('AWS_S3_CUSTOM_DOMAIN:', settings.AWS_S3_CUSTOM_DOMAIN)
print('AWS_S3_URL_PROTOCOL:', settings.AWS_S3_URL_PROTOCOL)
"

echo ""
echo "🖼️ 4. URL de exemplo gerada:"
docker compose exec backend python manage.py shell -c "
from apps.articles.models import Article
a = Article.objects.exclude(banner='').first()
if a and a.banner:
    print('URL:', a.banner.url)
    if 'https://https://' in a.banner.url:
        print('❌ ERRO: URL tem duplo https://')
    else:
        print('✅ OK: URL correta')
else:
    print('⚠️  Nenhum artigo com banner encontrado')
"

echo ""
echo "=========================================="
echo "Verificação completa!"
```

Salve como `check_minio.sh`, dê permissão (`chmod +x check_minio.sh`) e execute!

---

## 📚 Referências

- **Arquivo de configuração:** `backend/config/settings.py` (linhas 136-180)
- **Storage customizado:** `backend/apps/core/storage.py`
- **Documentação MinIO:** `docs/deploy/MINIO_CONFIG.md`
- **Issue resolvida:** Commit `6a6ba20` - 2026-01-10

---

## ✅ Conclusão

### Regra de Ouro

**NUNCA adicione `https://` no `MINIO_PUBLIC_DOMAIN`!**

O Django adiciona automaticamente baseado no ambiente:
- Localhost → `http://`
- Produção → `https://`

### Configuração Correta

```env
MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud
```

### URL Final Esperada

```
https://minio.projetoravenna.cloud/projetoravenna/articles/banners/image.webp
```

**SEM `https://https://`**!

---

**Este problema foi resolvido em:** 2026-01-10  
**Commits relacionados:**
- `fdc9328` - Correção .env.example
- `6a6ba20` - Correção docker-compose.yml
- `6a6ab9b` - Comando fix_double_https

**Nunca mais passe por isso!** 🎉
