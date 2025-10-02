# 🔗 Guia Completo de Integração Chatwoot + Evolution API

## 📋 Índice
1. [Visão Geral](#-visão-geral)
2. [Pré-requisitos](#-pré-requisitos)
3. [Configuração do Evolution API](#-configuração-do-evolution-api)
4. [Configuração do Chatwoot](#-configuração-do-chatwoot)
5. [Integração Passo a Passo](#-integração-passo-a-passo)
6. [Verificação da Integração](#-verificação-da-integração)
7. [Solução de Problemas](#-solução-de-problemas)
8. [Monitoramento](#-monitoramento)

---

## 🎯 Visão Geral

Este guia detalha como integrar completamente o **Chatwoot** (plataforma de atendimento) com a **Evolution API** (API WhatsApp) no Projeto Ravenna, permitindo:

- ✅ Recebimento automático de mensagens WhatsApp no Chatwoot
- ✅ Envio de mensagens do Chatwoot para WhatsApp
- ✅ Sincronização de contatos e conversas
- ✅ Histórico completo de conversas
- ✅ Múltiplas instâncias WhatsApp

---

## 🔧 Pré-requisitos

### ✅ Serviços Necessários
- [x] PostgreSQL (banco compartilhado)
- [x] Redis (cache compartilhado)
- [x] MinIO (armazenamento de mídia)
- [x] Evolution API (funcionando)
- [x] Chatwoot (funcionando)

### ✅ Verificação Inicial
```powershell
# Verificar se todos os serviços estão rodando
docker ps

# Executar script de monitoramento
.\monitor-services.ps1
```

---

## 🚀 Configuração do Evolution API

### 1️⃣ Configurações Principais

**Arquivo:** `evolution/.env`

```env
# Integração com Chatwoot ATIVADA
CHATWOOT_ENABLED=true
CHATWOOT_MESSAGE_READ=true

# Banco de dados compartilhado com Chatwoot
CHATWOOT_IMPORT_DATABASE_CONNECTION_URI=postgresql://postgres:minha_senha_super_segura_2024!@postgres:5432/chatwoot?sslmode=disable

# Configurações de mídia
CHATWOOT_IMPORT_PLACEHOLDER_MEDIA_MESSAGE=true

# API Key para autenticação
AUTHENTICATION_API_KEY=ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f_super_segura_2024
```

### 2️⃣ Configurações de Webhook (Importantes)

```env
# Webhooks globais (podem estar desativados)
WEBHOOK_GLOBAL_ENABLED=false

# Eventos específicos ATIVADOS para Chatwoot
WEBHOOK_EVENTS_APPLICATION_STARTUP=false
WEBHOOK_EVENTS_QRCODE_UPDATED=true
WEBHOOK_EVENTS_MESSAGES_SET=false
WEBHOOK_EVENTS_MESSAGES_UPSERT=true
WEBHOOK_EVENTS_MESSAGES_UPDATE=true
WEBHOOK_EVENTS_SEND_MESSAGE=true
WEBHOOK_EVENTS_CONTACTS_SET=false
WEBHOOK_EVENTS_CONTACTS_UPSERT=true
WEBHOOK_EVENTS_CONTACTS_UPDATE=true
WEBHOOK_EVENTS_CONNECTION_UPDATE=true
```

---

## 🎨 Configuração do Chatwoot

### 1️⃣ Configurações de Banco

**Arquivo:** `chatwoot/.env`

```env
# Banco PostgreSQL compartilhado
POSTGRES_HOST=postgres
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=minha_senha_super_segura_2024!
POSTGRES_DATABASE=chatwoot

# Redis compartilhado
REDIS_URL=redis://redis:6379
```

### 2️⃣ Configurações de Integração

```env
# URL base do Chatwoot
FRONTEND_URL=http://localhost:3000
FORCE_SSL=false

# Configurações de mídia (MinIO)
ACTIVE_STORAGE_SERVICE=local
```

---

## 🔗 Integração Passo a Passo

### **PASSO 1: Verificar Serviços**

```powershell
# 1. Verificar se todos os containers estão rodando
docker ps

# 2. Verificar conectividade entre serviços
docker exec evolution_api ping -c 3 postgres
docker exec evolution_api ping -c 3 redis
docker exec evolution_api ping -c 3 projetoravenna-chatwoot-rails-1
```

### **PASSO 2: Criar Instância WhatsApp no Evolution API**

```powershell
# 1. Criar nova instância
$apiKey = "ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f_super_segura_2024"
$instanceName = "chatwoot_principal"

# Criar instância
Invoke-WebRequest -Uri "http://192.168.0.121:8080/instance/create" -Method POST -Headers @{"apikey"=$apiKey} -ContentType "application/json" -Body (@{
    instanceName = $instanceName
    integration = "WHATSAPP-BAILEYS"
} | ConvertTo-Json)
```

### **PASSO 3: Configurar Integração Chatwoot na Instância**

```powershell
# Configurar integração Chatwoot para a instância
# IMPORTANTE: Todos os campos abaixo são obrigatórios
$chatwootConfig = @{
    enabled = $true
    accountId = "1"  # ID da conta no Chatwoot (obrigatório)
    token = "chatwoot_token_exemplo"  # Token de acesso do Chatwoot (obrigatório)
    url = "http://projetoravenna-chatwoot-rails-1:3000"  # URL do Chatwoot (obrigatório)
    signMsg = $true  # Assinar mensagens (obrigatório)
    reopenConversation = $true  # Reabrir conversas (obrigatório)
    conversationPending = $false  # Conversas pendentes (obrigatório)
}

# Aplicar configuração à instância
Invoke-RestMethod -Uri "http://192.168.0.121:8080/chatwoot/set/$instanceName" -Method POST -Headers @{"apikey"=$apiKey; "Content-Type"="application/json"} -Body ($chatwootConfig | ConvertTo-Json)
```

> **⚠️ ATENÇÃO:** Para obter o `token` e `accountId` corretos:
> 1. Acesse o Chatwoot: http://localhost:3000
> 2. Vá em **Configurações** → **Integrações** → **API Access Tokens**
> 3. Crie um novo token ou use um existente
> 4. O `accountId` pode ser encontrado na URL ou nas configurações da conta

### **PASSO 4: Conectar WhatsApp**

```powershell
# 1. Obter QR Code
$qrResponse = Invoke-WebRequest -Uri "http://192.168.0.121:8080/instance/connect/$instanceName" -Headers @{"apikey"=$apiKey} -Method GET
$qrData = $qrResponse.Content | ConvertFrom-Json

# 2. O QR Code estará em $qrData.base64
# Salvar QR Code em arquivo para visualização
$qrData.base64 | Out-File -FilePath "qrcode_$instanceName.txt"

Write-Host "QR Code salvo em qrcode_$instanceName.txt"
Write-Host "Escaneie com seu WhatsApp para conectar!"
```

### **PASSO 5: Configurar Inbox no Chatwoot**

1. **Acessar Chatwoot:** http://192.168.0.121:3000
2. **Login:** Use as credenciais configuradas
3. **Ir para:** Configurações → Inboxes → Adicionar Inbox
4. **Selecionar:** WhatsApp
5. **Configurar:**
   - **Nome:** WhatsApp Principal
   - **Número:** (será preenchido automaticamente após conexão)
   - **Webhook URL:** `http://evolution_api:8080/webhook/chatwoot`

### **PASSO 6: Verificar Conexão**

```powershell
# Verificar status da instância
Invoke-WebRequest -Uri "http://192.168.0.121:8080/instance/fetchInstances" -Headers @{"apikey"=$apiKey} -Method GET | ConvertFrom-Json

# Verificar se aparece como "open" (conectado)
```

---

## ✅ Verificação da Integração

### 1️⃣ Teste de Conectividade

```powershell
# Script de verificação completa
.\monitor-services.ps1
```

### 2️⃣ Teste de Mensagens

1. **Enviar mensagem para o WhatsApp conectado**
2. **Verificar se aparece no Chatwoot**
3. **Responder pelo Chatwoot**
4. **Verificar se chega no WhatsApp**

### 3️⃣ Verificar Logs

```powershell
# Logs do Evolution API
docker logs evolution_api --tail 20

# Logs do Chatwoot
docker logs projetoravenna-chatwoot-rails-1 --tail 20
docker logs chatwoot-sidekiq --tail 20
```

---

## 🚨 Solução de Problemas

### ❌ **Problema: Instância não conecta**

**Sintomas:**
- Status permanece "connecting"
- QR Code não funciona

**Soluções:**
```powershell
# 1. Reiniciar instância
Invoke-WebRequest -Uri "http://192.168.0.121:8080/instance/restart/$instanceName" -Headers @{"apikey"=$apiKey} -Method PUT

# 2. Verificar logs
docker logs evolution_api --tail 50

# 3. Recriar instância se necessário
Invoke-WebRequest -Uri "http://192.168.0.121:8080/instance/delete/$instanceName" -Headers @{"apikey"=$apiKey} -Method DELETE
```

### ❌ **Problema: Mensagens não chegam no Chatwoot**

**Verificações:**
```powershell
# 1. Verificar configuração Chatwoot na instância
Invoke-WebRequest -Uri "http://localhost:8080/instance/fetchInstances" -Headers @{"apikey"=$apiKey} -Method GET

# 2. Verificar conectividade
docker exec evolution_api ping -c 3 projetoravenna-chatwoot-rails-1

# 3. Verificar banco de dados
docker exec postgres_chatwoot psql -U postgres -d chatwoot_production -c "SELECT * FROM inboxes;"
```

### ❌ **Problema: Mídia não funciona**

**Soluções:**
```powershell
# 1. Verificar MinIO
docker logs minio_server --tail 20

# 2. Testar acesso MinIO
Invoke-WebRequest -Uri "http://192.168.0.121:9001" -Method GET

# 3. Verificar configurações S3 no Evolution
# Arquivo: evolution/.env
# S3_ENABLED=true
# S3_BUCKET=evolution
```

---

## 📊 Monitoramento

### 🔄 Monitoramento Automático

```powershell
# Executar script de monitoramento
.\monitor-services.ps1

# Verificar instâncias WhatsApp
$apiKey = "ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f_super_segura_2024"
Invoke-WebRequest -Uri "http://192.168.0.121:8080/instance/fetchInstances" -Headers @{"apikey"=$apiKey} -Method GET
```

### 📈 Métricas Importantes

| Métrica | Como Verificar | Status Ideal |
|---------|----------------|--------------|
| **Conexão WhatsApp** | Status da instância | `open` |
| **Mensagens/min** | Logs Evolution API | Sem erros |
| **Inbox Chatwoot** | Interface Chatwoot | Ativo |
| **Banco de dados** | Conexões PostgreSQL | Estável |
| **Cache Redis** | Conexões Redis | Funcionando |

### 🔔 Alertas Recomendados

1. **Instância desconectada** → Status != "open"
2. **Erro de webhook** → Logs com erro 500/400
3. **Banco indisponível** → Erro conexão PostgreSQL
4. **Cache indisponível** → Erro conexão Redis

---

## 📝 Configurações Avançadas

### 🔧 Múltiplas Instâncias

Para criar múltiplas instâncias WhatsApp:

```powershell
# Criar segunda instância
$instanceName2 = "chatwoot_vendas"
Invoke-WebRequest -Uri "http://localhost:8080/instance/create" -Method POST -Headers @{"apikey"=$apiKey} -ContentType "application/json" -Body (@{
    instanceName = $instanceName2
    integration = "WHATSAPP-BAILEYS"
} | ConvertTo-Json)

# Configurar Chatwoot para segunda instância
# (repetir PASSO 3 com $instanceName2)
```

### 🎨 Personalização de Mensagens

**Arquivo:** `evolution/.env`

```env
# Mensagem de boas-vindas
CONFIG_SESSION_PHONE_CLIENT=Projeto Ravenna
CONFIG_SESSION_PHONE_NAME=Atendimento

# Configurações de leitura
CHATWOOT_MESSAGE_READ=true
```

---

## 🎯 Checklist Final

### ✅ Pré-Integração
- [ ] Todos os containers rodando
- [ ] Rede Docker criada (`app_network`)
- [ ] Banco PostgreSQL acessível
- [ ] Redis funcionando
- [ ] MinIO configurado

### ✅ Configuração Evolution API
- [ ] `CHATWOOT_ENABLED=true`
- [ ] API Key configurada
- [ ] Banco Chatwoot configurado
- [ ] Webhooks ativados

### ✅ Configuração Chatwoot
- [ ] Banco PostgreSQL conectado
- [ ] Redis conectado
- [ ] Interface acessível
- [ ] Inbox WhatsApp criado

### ✅ Integração
- [ ] Instância WhatsApp criada
- [ ] QR Code escaneado
- [ ] Status "open"
- [ ] Mensagens funcionando
- [ ] Mídia funcionando

### ✅ Monitoramento
- [ ] Script de monitoramento funcionando
- [ ] Logs sem erros
- [ ] Métricas estáveis
- [ ] Alertas configurados

---

## 📞 Suporte

### 🔗 URLs Importantes
- **Evolution API:** http://192.168.0.121:8080
- **Chatwoot:** http://192.168.0.121:3000
- **MinIO Console:** http://192.168.0.121:9001
- **Monitoramento:** `.\monitor-services.ps1`

### 🔑 Credenciais
- **API Key Evolution:** `ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f_super_segura_2024`
- **PostgreSQL:** `postgres:minha_senha_super_segura_2024!`
- **MinIO:** Ver arquivo `minio/.env`

### 📋 Comandos Úteis

```powershell
# Reiniciar serviços
docker-compose restart evolution_api
docker-compose restart projetoravenna-chatwoot-rails-1

# Verificar logs
docker logs evolution_api --follow
docker logs projetoravenna-chatwoot-rails-1 --follow

# Backup banco
docker exec postgres_chatwoot pg_dump -U postgres chatwoot_production > backup_chatwoot.sql
```

---

**✨ Integração concluída com sucesso!**

*Última atualização: $(Get-Date)*