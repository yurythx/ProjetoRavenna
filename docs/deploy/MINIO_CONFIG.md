# 🪣 Configuração Completa do MinIO + Cloudflare Tunnel

**ATENÇÃO:** Esta configuração é **CRÍTICA** para o funcionamento correto das imagens em produção!

---

## 🔴 Problema Comum: Imagens Quebradas em Produção

### ❌ Configuração ERRADA
```yaml
# docker-compose.yml
environment:
  - MINIO_PUBLIC_DOMAIN=localhost:9000  # ❌ QUEBRA IMAGENS!
```

**O que acontece:**
1. Usuário acessa `https://projetoravenna.cloud`
2. Site retorna HTML com imagem: `<img src="http://localhost:9000/bucket/foto.jpg">`
3. Navegador do usuário tenta acessar `localhost:9000` (seu próprio computador)
4. **Imagem quebrada** 🖼️❌

---

### ✅ Configuração CORRETA
```yaml
# docker-compose.yml
environment:
  # COMUNICAÇÃO INTERNA (Django -> MinIO): Nome do container
  - MINIO_ENDPOINT_URL=http://minio:9000
  
  # COMUNICAÇÃO EXTERNA (Navegador -> MinIO): Domínio público
  - MINIO_PUBLIC_DOMAIN=https://minio.projetoravenna.cloud
```

**O que acontece:**
1. Usuário acessa `https://projetoravenna.cloud`
2. Site retorna HTML com imagem: `<img src="https://minio.projetoravenna.cloud/bucket/foto.jpg">`
3. Navegador acessa Cloudflare → MinIO
4. **Imagem carregada** 🖼️✅

---

## 📋 Entendendo as Duas Variáveis

### 1. MINIO_ENDPOINT_URL (Comunicação Interna) 🔒

```yaml
MINIO_ENDPOINT_URL=http://minio:9000
```

**Uso:** Django (backend) → MinIO  
**Contexto:** Dentro da rede Docker  
**Quando:** Upload de arquivos, operações S3  
**Por que `minio`:** É o nome do serviço no docker-compose

✅ **Sempre use:** `http://minio:9000` (não mude!)

---

### 2. MINIO_PUBLIC_DOMAIN (Comunicação Externa) 🌐

```yaml
# Desenvolvimento Local
MINIO_PUBLIC_DOMAIN=localhost:9000

# Produção
MINIO_PUBLIC_DOMAIN=https://minio.projetoravenna.cloud
```

**Uso:** Navegador do usuário → MinIO  
**Contexto:** Internet pública  
**Quando:** Exibir imagens/arquivos no site  
**Por que domínio:** Precisa ser acessível de qualquer lugar

⚠️ **Em produção SEMPRE use domínio público!**

---

## 🔧 Configuração Passo a Passo

### Passo 1: Corrigir docker-compose.yml ✅

**Arquivo:** `docker-compose.yml`

```yaml
services:
  backend:
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/projetoravenna
      - REDIS_URL=redis://redis:6379/1
      
      # INTERNO: Django fala com MinIO pelo nome do container
      - MINIO_ENDPOINT_URL=http://minio:9000
      
      # EXTERNO: Usuários acessam pelo domínio público
      - MINIO_PUBLIC_DOMAIN=https://minio.projetoravenna.cloud
      
      - USE_MINIO=True
```

---

### Passo 2: Configurar Cloudflare Tunnel 🌐

Você **DEVE** configurar uma rota no Cloudflare Tunnel para o MinIO.

#### Opção A: Via Dashboard Cloudflare (Recomendado)

1. **Acesse:** [Cloudflare Dashboard](https://one.dash.cloudflare.com)
   - Zero Trust → Networks → Tunnels

2. **Selecione seu Tunnel** (ou crie um novo)

3. **Adicione Public Hostname:**
   ```
   Subdomain: minio
   Domain:    projetoravenna.cloud
   Type:      HTTP
   URL:       http://minio:9000
   ```

4. **Salvar e aguardar** (propagação: ~2 minutos)

#### Opção B: Via config.yaml do cloudflared

Se você usa arquivo de configuração:

```yaml
# cloudflared/config.yaml
tunnel: SEU_TUNNEL_ID
credentials-file: /etc/cloudflared/credentials.json

ingress:
  # Frontend
  - hostname: projetoravenna.cloud
    service: http://frontend:3001
  
  # API Backend
  - hostname: api.projetoravenna.cloud
    service: http://backend:8000
  
  # MinIO (NOVO!)
  - hostname: minio.projetoravenna.cloud
    service: http://minio:9000
  
  # Catch-all
  - service: http_status:404
```

---

### Passo 3: Conectar Cloudflared à Rede Docker 🐋

**CRÍTICO:** O container do Cloudflare precisa estar na mesma rede que o MinIO!

```bash
# 1. Verificar nome do container Cloudflare
docker ps | grep cloudflare

# 2. Criar rede (se não existir)
docker network create projetoravenna_network

# 3. Conectar Cloudflared à rede
docker network connect projetoravenna_network NOME_DO_CONTAINER_CLOUDFLARE

# Exemplo:
docker network connect projetoravenna_network cloudflared
```

**Verificar conexão:**
```bash
docker network inspect projetoravenna_network
# Deve listar: backend, frontend, db, redis, minio, cloudflared
```

---

### Passo 4: Configurar DNS no Cloudflare 🌍

1. **Acesse:** [Cloudflare DNS](https://dash.cloudflare.com)
   - Selecione domínio: `projetoravenna.cloud`
   - DNS → Records

2. **Verificar/Adicionar CNAME:**
   ```
   Type:    CNAME
   Name:    minio
   Target:  SEU_TUNNEL_ID.cfargotunnel.com
   Proxy:   ✅ Proxied (nuvem laranja)
   ```

   Ou pode ser tipo A apontando para Cloudflare (gerenciado automaticamente pelo tunnel).

3. **Aguardar propagação** (~5 minutos)

---

### Passo 5: Testar Configuração ✅

#### Teste 1: Health do MinIO
```bash
# No servidor
curl http://localhost:9000/minio/health/live

# Deve retornar: 200 OK
```

#### Teste 2: Acesso Público
```bash
# Da sua máquina local
curl https://minio.projetoravenna.cloud/minio/health/live

# Deve retornar: 200 OK ou XML do MinIO
```

#### Teste 3: Console do MinIO
Acessar no navegador:
```
https://minio.projetoravenna.cloud
```

Deve aparecer tela de login do MinIO Console.

#### Teste 4: Upload de Imagem
1. Fazer login no admin Django
2. Criar/editar um artigo
3. Fazer upload de uma imagem
4. Publicar artigo
5. Abrir site público
6. **Inspecionar URL da imagem** (F12 → Network)
   - Deve ser: `https://minio.projetoravenna.cloud/projetoravenna/...`
   - **NÃO** deve ser: `http://localhost:9000/...`

---

## 🔄 Ambiente de Desenvolvimento vs Produção

### Desenvolvimento Local

Se você está testando **apenas no seu computador**:

```yaml
# docker-compose.yml (desenvolvimento)
environment:
  - MINIO_PUBLIC_DOMAIN=localhost:9000  # OK para dev local
```

✅ Use `localhost:9000` **APENAS** se:
- Você está rodando tudo localmente
- Não vai testar de outro dispositivo (celular, outro PC)
- Não vai compartilhar o link com ninguém

---

### Produção (Servidor)

Se o site está **acessível na internet**:

```yaml
# docker-compose.yml (produção)
environment:
  - MINIO_PUBLIC_DOMAIN=https://minio.projetoravenna.cloud  # ✅ OBRIGATÓRIO
```

✅ **SEMPRE** use domínio público em produção!

---

## 🔐 Configuração de Bucket e Permissões

### Criar Bucket Automaticamente

O script `deploy.sh` já cria o bucket automaticamente via serviço `createbuckets`.

Mas você pode fazer manualmente:

```bash
# Via Docker
docker-compose exec minio mc alias set myminio http://localhost:9000 minioadmin minioadmin
docker-compose exec minio mc mb myminio/projetoravenna
docker-compose exec minio mc anonymous set public myminio/projetoravenna
```

### Política de Acesso

Para permitir download público de imagens:

```bash
# Tornar bucket público para leitura
docker-compose exec minio mc anonymous set download myminio/projetoravenna
```

Ou via Django management command:
```bash
docker-compose exec backend python manage.py fix_minio
```

---

## 🛡️ Segurança e CORS

### Configurar CORS no MinIO

Se tiver problemas de CORS (erro no console do navegador):

```bash
# Configurar CORS
docker-compose exec minio mc anonymous set-json myminio/projetoravenna <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::projetoravenna/*"]
    }
  ]
}
EOF
```

### SSL/TLS no Cloudflare

Configurar SSL mode no Cloudflare:

1. **Acesse:** Cloudflare Dashboard → SSL/TLS
2. **SSL/TLS encryption mode:**
   - Desenvolvimento: **Flexible**
   - Produção: **Full** ou **Full (strict)**

---

## 📊 Verificação Final

### Checklist de Configuração MinIO

Antes de considerar concluído:

- [ ] `docker-compose.yml` tem `MINIO_PUBLIC_DOMAIN` com domínio público
- [ ] Cloudflare Tunnel configurado para subdomain `minio`
- [ ] Container cloudflared conectado à rede `projetoravenna_network`
- [ ] DNS CNAME/A apontando para tunnel
- [ ] Health check do MinIO retorna 200 OK
- [ ] Console acessível via `https://minio.projetoravenna.cloud`
- [ ] Bucket `projetoravenna` criado
- [ ] Política de acesso configurada (público ou privado)
- [ ] Upload de teste funciona
- [ ] Imagem aparece no site público
- [ ] URL da imagem usa `https://minio...` e NÃO `localhost`

---

## 🆘 Troubleshooting

### Problema: Imagens quebradas (404 Not Found)

**Sintomas:**
- Site carrega, mas imagens não aparecem
- Console do navegador mostra erro 404

**Causas:**
1. `MINIO_PUBLIC_DOMAIN` ainda com `localhost`
2. Cloudflare Tunnel não configurado para MinIO
3. Bucket não existe
4. Permissões erradas no bucket

**Solução:**
```bash
# 1. Verificar variável
docker-compose exec backend env | grep MINIO_PUBLIC_DOMAIN
# Deve mostrar: https://minio.projetoravenna.cloud

# 2. Verificar rota do Cloudflare
curl https://minio.projetoravenna.cloud

# 3. Recriar bucket
docker-compose exec backend python manage.py fix_minio

# 4. Verificar permissões
docker-compose exec minio mc anonymous get myminio/projetoravenna
```

---

### Problema: CORS Error

**Sintoma:**
```
Access to fetch at 'https://minio.projetoravenna.cloud/...' 
from origin 'https://projetoravenna.cloud' has been blocked by CORS policy
```

**Solução:**

Adicionar CORS no backend Django (`settings.py` já deve ter):
```python
CORS_ALLOWED_ORIGINS = [
    'https://projetoravenna.cloud',
    'https://www.projetoravenna.cloud',
    'https://minio.projetoravenna.cloud',
]
```

E configurar CORS no MinIO (via Management Command ou Console).

---

### Problema: Cloudflare 502 Bad Gateway

**Causas:**
1. Container MinIO não está rodando
2. Cloudflared não está na rede Docker
3. Porta errada na configuração do tunnel

**Solução:**
```bash
# 1. Verificar containers
docker-compose ps

# 2. Verificar rede
docker network inspect projetoravenna_network | grep -A 5 cloudflared

# 3. Reconectar cloudflared
docker network connect projetoravenna_network cloudflared

# 4. Reiniciar cloudflared
docker restart cloudflared
```

---

## 📝 Resumo da Configuração

### Desenvolvimento Local
```yaml
# docker-compose.yml
MINIO_ENDPOINT_URL: http://minio:9000
MINIO_PUBLIC_DOMAIN: localhost:9000
```

### Produção
```yaml
# docker-compose.yml
MINIO_ENDPOINT_URL: http://minio:9000
MINIO_PUBLIC_DOMAIN: https://minio.projetoravenna.cloud
```

### Cloudflare Tunnel
```
Subdomain: minio
Domain:    projetoravenna.cloud
Service:   http://minio:9000
```

### Rede Docker
```bash
docker network connect projetoravenna_network cloudflared
```

---

## ✅ Configuração Completa!

Se você seguiu **todos** os passos acima, seu MinIO está configurado corretamente e as imagens vão funcionar perfeitamente em produção! 🎉

---

**Última atualização:** 2026-01-10  
**Autor:** ProjetoRavenna Team
