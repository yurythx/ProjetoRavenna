# 🔐 Configuração de Segurança - Projeto Ravenna

## ⚠️ IMPORTANTE - LEIA ANTES DE USAR EM PRODUÇÃO

Este documento lista **TODAS** as credenciais e configurações que **DEVEM** ser alteradas antes de usar o sistema em produção. As credenciais padrão são apenas para desenvolvimento e testes.

## 🚨 Resumo Executivo

**Total de credenciais a alterar**: 12 itens críticos
**Tempo estimado de configuração**: 15-30 minutos
**Nível de risco com credenciais padrão**: 🔴 **CRÍTICO**

## 📋 Checklist de Segurança

### 1. 🗄️ Banco de Dados PostgreSQL

**Arquivo**: `postgres/postgres.yml`
```yaml
POSTGRES_PASSWORD: minha_senha  # ❌ ALTERAR OBRIGATÓRIO
```

**Arquivos que referenciam**:
- `chatwoot/chatwoot.yml` (linha 64, 157)
- `n8n/n8n.yml` (linha 36, 86, 135)
- `evolution/evolution.yml` (linha 45, 157)

**Ação necessária**: Alterar `minha_senha` para uma senha forte em todos os arquivos.

### 2. 🗂️ MinIO (Armazenamento S3)

**Arquivo**: `minio/minio.yml`
```yaml
MINIO_ROOT_USER: admin          # ❌ ALTERAR RECOMENDADO
MINIO_ROOT_PASSWORD: minha_senha # ❌ ALTERAR OBRIGATÓRIO
```

**Chaves de acesso nos arquivos**:
- `chatwoot/chatwoot.yml`:
  - `STORAGE_ACCESS_KEY_ID: "0XggPPlXeMJVsqoTblIz"`
  - `STORAGE_SECRET_ACCESS_KEY: "cO8lTX9wKcn3NBGdp2itSoV7skeqnizQsbKIRgfZ"`
- `evolution/evolution.yml`:
  - `S3_ACCESS_KEY: LnOfRyvjGQ7XWTidwfbj`
  - `S3_SECRET_KEY: X22BmmluK6qFXduEsM54NOp9IHfToVNKt59iX4cM`

### 3. 🔑 Chatwoot

**Arquivo**: `chatwoot/chatwoot.yml`
```yaml
SECRET_KEY_BASE: "chave_unica"   # ❌ ALTERAR OBRIGATÓRIO
SMTP_PASSWORD: sua_senha         # ❌ CONFIGURAR OBRIGATÓRIO
```

**Como gerar SECRET_KEY_BASE**:
```bash
openssl rand -hex 64
```

### 4. ⚙️ N8N

**Arquivo**: `n8n/n8n.yml`
```yaml
N8N_ENCRYPTION_KEY: Y8Dmy5FhuRIDGIrs  # ❌ ALTERAR OBRIGATÓRIO
```

**Como gerar chave de criptografia**:
```bash
openssl rand -base64 32
```

### 5. 📱 Evolution API

**Arquivo**: `evolution/evolution.yml`
```yaml
AUTHENTICATION_API_KEY: ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f  # ❌ ALTERAR OBRIGATÓRIO
WA_BUSINESS_TOKEN_WEBHOOK: evolution  # ❌ ALTERAR RECOMENDADO
```

### 6. ☁️ Cloudflare Tunnel

**Arquivo**: `cloudflare/cloudflare.yml`
```yaml
command: tunnel --no-autoupdate run --token SEU_TOKEN_AQUI  # ❌ CONFIGURAR OBRIGATÓRIO
```

**Como obter o token**:
1. Acesse [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. Vá em Access > Tunnels
3. Crie um novo túnel e copie o token

## 🌐 Configurações de IP e URLs

### IPs Atuais (192.168.1.74)
Todos os arquivos estão configurados com o IP `192.168.1.74`. **Altere para o IP do seu servidor**:

**Arquivos que precisam de alteração**:
- `chatwoot/chatwoot.yml`: `FRONTEND_URL`, `STORAGE_ENDPOINT`
- `n8n/n8n.yml`: `N8N_HOST`, `N8N_EDITOR_BASE_URL`, `WEBHOOK_URL`
- `evolution/evolution.yml`: `SERVER_URL`
- `minio/minio.yml`: `MINIO_BROWSER_REDIRECT_URL`, `MINIO_SERVER_URL`

### 📧 Configuração SMTP

**Arquivo**: `chatwoot/chatwoot.yml`
```yaml
SMTP_DOMAIN: smtp.gmail.com      # Alterar conforme seu provedor
SMTP_PORT: 587                   # Alterar conforme seu provedor
SMTP_USERNAME: seu-email@gmail.com  # ❌ CONFIGURAR OBRIGATÓRIO
SMTP_PASSWORD: sua_senha         # ❌ CONFIGURAR OBRIGATÓRIO
```

## 🛡️ Configurações Adicionais de Segurança

### 1. Redis (Opcional)
Por padrão, o Redis não tem senha. Para adicionar:

**Arquivo**: `redis/redis.yml`
```yaml
command: ["redis-server", "--appendonly", "yes", "--port", "6379", "--requirepass", "SUA_SENHA_REDIS"]
```

### 2. Firewall
Configure o firewall para permitir apenas as portas necessárias:
- 3000 (Chatwoot)
- 5678 (N8N)
- 8080 (Evolution API)
- 9001 (MinIO Console)

### 3. SSL/TLS
Para produção, configure SSL/TLS:
- Use Cloudflare Tunnel (recomendado)
- Configure certificados SSL nos serviços
- Altere URLs de `http://` para `https://`

## 🔄 Script de Configuração Rápida

Crie um arquivo `.env` com suas configurações:

```bash
# .env
POSTGRES_PASSWORD=sua_senha_postgres_forte
MINIO_ROOT_USER=seu_usuario_minio
MINIO_ROOT_PASSWORD=sua_senha_minio_forte
CHATWOOT_SECRET_KEY=$(openssl rand -hex 64)
N8N_ENCRYPTION_KEY=$(openssl rand -base64 32)
EVOLUTION_API_KEY=$(openssl rand -hex 32)
SERVER_IP=seu.ip.do.servidor
SMTP_USERNAME=seu-email@provedor.com
SMTP_PASSWORD=sua-senha-de-app
CLOUDFLARE_TOKEN=seu-token-cloudflare
```

## ✅ Verificação Final

Antes de colocar em produção, execute este checklist:

### 🔍 Verificação de Credenciais
- [ ] **PostgreSQL**: Senha alterada em todos os 4 arquivos
- [ ] **MinIO**: Usuário e senha alterados + chaves de acesso atualizadas
- [ ] **Chatwoot**: SECRET_KEY_BASE gerado + SMTP configurado
- [ ] **N8N**: Chave de criptografia gerada
- [ ] **Evolution API**: Chave de API gerada
- [ ] **Cloudflare**: Token configurado (se usar)

### 🌐 Verificação de Rede
- [ ] **IPs**: Atualizados para seu servidor em todos os arquivos
- [ ] **Portas**: Firewall configurado para portas necessárias
- [ ] **DNS**: Domínios configurados (se usar)
- [ ] **SSL/TLS**: Certificados instalados e funcionando

### 📧 Verificação de SMTP
- [ ] **Provedor**: Configurado (Gmail, Outlook, etc.)
- [ ] **Autenticação**: Senha de app gerada
- [ ] **Teste**: E-mail de teste enviado com sucesso

### 🔒 Verificação de Segurança
- [ ] **Backup**: Sistema de backup configurado
- [ ] **Logs**: Monitoramento ativo
- [ ] **Firewall**: Regras aplicadas
- [ ] **Updates**: Sistema atualizado

## 🧪 Script de Teste

Execute este script para testar as configurações:

```powershell
# Teste de conectividade dos serviços
Write-Host "🔍 Testando conectividade dos serviços..."

$services = @{
    "PostgreSQL" = "localhost:5432"
    "Redis" = "localhost:6379"
    "MinIO" = "localhost:9002"
    "Chatwoot" = "localhost:3000"
    "N8N" = "localhost:5678"
    "Evolution" = "localhost:8080"
}

foreach ($service in $services.GetEnumerator()) {
    $result = Test-NetConnection -ComputerName ($service.Value -split ":")[0] -Port ($service.Value -split ":")[1] -WarningAction SilentlyContinue
    if ($result.TcpTestSucceeded) {
        Write-Host "✅ $($service.Key): Conectado" -ForegroundColor Green
    } else {
        Write-Host "❌ $($service.Key): Falha na conexão" -ForegroundColor Red
    }
}
```

## 🚨 Nunca Faça

- ❌ Não use as credenciais padrão em produção
- ❌ Não exponha as portas diretamente na internet
- ❌ Não commite credenciais no Git
- ❌ Não use HTTP em produção (sempre HTTPS)
- ❌ Não desabilite logs de segurança

## 📞 Suporte

Se precisar de ajuda com a configuração de segurança:
- Consulte a documentação oficial de cada serviço
- Verifique os logs para identificar problemas
- Use ferramentas de teste de segurança

---

**⚠️ LEMBRE-SE**: A segurança é responsabilidade de todos. Mantenha sempre suas credenciais seguras e atualizadas!