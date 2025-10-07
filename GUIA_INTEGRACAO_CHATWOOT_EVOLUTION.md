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
# API Key (Projeto Ravenna)
AUTHENTICATION_API_KEY=evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456
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
$apiKey = "evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456"
$instanceName = "Ravenna"

# Criar instância
Invoke-WebRequest -Uri "http://localhost:8080/instance/create" -Method POST -Headers @{"apikey"=$apiKey} -ContentType "application/json" -Body (@{
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
    token = "eKWgQ3ZRf15fkspq7Grf3hdN"  # Token de acesso do Chatwoot (obrigatório)
    url = "http://chatwoot-rails:3000"  # URL do Chatwoot (acessível dentro do Docker)
    signMsg = $false  # Assinar mensagens (opcional)
    reopenConversation = $true  # Reabrir conversas (obrigatório)
    conversationPending = $false  # Conversas pendentes (obrigatório)
}

# Aplicar configuração à instância (substitua localhost por <SEU_IP> se necessário)
Invoke-RestMethod -Uri "http://<SEU_IP>:8080/chatwoot/set/$instanceName" -Method POST -Headers @{"apikey"=$apiKey; "Content-Type"="application/json"} -Body ($chatwootConfig | ConvertTo-Json)
```

> **⚠️ ATENÇÃO:** Para obter o `token` e `accountId` corretos:
> 1. Acesse o Chatwoot: http://localhost:3000
> 2. Vá em **Configurações** → **Integrações** → **API Access Tokens**
> 3. Crie um novo token ou use um existente
> 4. O `accountId` pode ser encontrado na URL ou nas configurações da conta

### **PASSO 4: Conectar WhatsApp**

```powershell
# 1. Obter QR Code
$qrResponse = Invoke-WebRequest -Uri "http://localhost:8080/instance/connect/$instanceName" -Headers @{"apikey"=$apiKey} -Method GET
$qrData = $qrResponse.Content | ConvertFrom-Json

# 2. O QR Code estará em $qrData.base64
# Salvar QR Code em arquivo para visualização
$qrData.base64 | Out-File -FilePath "qrcode_$instanceName.txt"

Write-Host "QR Code salvo em qrcode_$instanceName.txt"
Write-Host "Escaneie com seu WhatsApp para conectar!"
```

### **PASSO 5: Inbox no Chatwoot (sem webhook)**

1. **Acessar Chatwoot:** http://localhost:3000
2. **Login:** Use as credenciais configuradas
3. **Ir para:** Configurações → Inboxes → Adicionar Inbox
4. **Nome:** por exemplo, "Ravenna" ou "WhatsApp Principal"
5. **Webhook:** não é necessário nesta build. O Evolution criará/atualizará conversas via API do Chatwoot.

### **PASSO 6: Verificar Conexão**

```powershell
# Verificar status da instância
Invoke-WebRequest -Uri "http://localhost:8080/instance/fetchInstances" -Headers @{"apikey"=$apiKey} -Method GET | ConvertFrom-Json

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
Invoke-WebRequest -Uri "http://localhost:9001" -Method GET

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
$apiKey = "evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456"
Invoke-WebRequest -Uri "http://localhost:8080/instance/fetchInstances" -Headers @{"apikey"=$apiKey} -Method GET
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

## 🖼️ Checklist Visual (Chatwoot + Evolution)

### Chatwoot — Canal API
- Acesse `Configurações` → `Inboxes` → `Novo inbox` → `API`.
- Nome do Canal: `WhatsApp - Principal (Ravenna)`.
- Deixe `URL do Webhook` em branco nesta integração.
- Salve o canal.
- Em `Configurações` → `Conta`, confirme o `account_id` (ex.: `1`).
- Em `Perfil` → `Tokens de acesso`, gere ou copie o token: `eKWgQ3ZRf15fkspq7Grf3hdN`.

### Evolution — Aplicar Configuração da Instância
- Use `POST /chatwoot/set/Ravenna` com cabeçalho `apikey`.
- Se Chatwoot estiver na rede Docker: `url: http://chatwoot-rails:3000`.
- Se publicado no host: `url: http://<SEU_IP>:3000/`.

### Teste de Ponta a Ponta
- Inbound: envie uma mensagem para o WhatsApp conectado e verifique a conversa na Inbox do Chatwoot.
- Outbound: responda pelo Chatwoot e confirme a entrega no WhatsApp.
- Flags esperadas: `signMsg=false`, `reopenConversation=true`.

### Comandos rápidos (curl)
```bash
# Substitua <SEU_IP> pelo IP da sua máquina (ex.: 192.168.0.121)
APIKEY='evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456'

# 1) Aplicar configuração (rede Docker interna)
curl -X POST "http://<SEU_IP>:8080/chatwoot/set/Ravenna" \
  -H "apikey: ${APIKEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "conversationPending": false,
    "accountId": "1",
    "token": "eKWgQ3ZRf15fkspq7Grf3hdN",
    "url": "http://chatwoot-rails:3000",
    "signMsg": false,
    "reopenConversation": true
  }'

# 2) Aplicar configuração (Chatwoot publicado no host)
curl -X POST "http://<SEU_IP>:8080/chatwoot/set/Ravenna" \
  -H "apikey: ${APIKEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "conversationPending": false,
    "accountId": "1",
    "token": "eKWgQ3ZRf15fkspq7Grf3hdN",
    "url": "http://<SEU_IP>:3000/",
    "signMsg": false,
    "reopenConversation": true
  }'

# 3) Verificar instâncias conectadas
curl -s -H "apikey: ${APIKEY}" "http://<SEU_IP>:8080/instance/fetchInstances" | jq

# 4) Listar conversas no Chatwoot
curl -s "http://<SEU_IP>:3000/api/v1/accounts/1/conversations?api_access_token=eKWgQ3ZRf15fkspq7Grf3hdN" | jq
```

### Comandos rápidos (PowerShell)
```powershell
$apiKey = "evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456"
$base = "http://<SEU_IP>:8080"

$payload = @{ 
  enabled = $true
  conversationPending = $false
  accountId = "1"
  token = "eKWgQ3ZRf15fkspq7Grf3hdN"
  url = "http://chatwoot-rails:3000"  # use http://<SEU_IP>:3000/ se Chatwoot estiver no host
  signMsg = $false
  reopenConversation = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "$base/chatwoot/set/Ravenna" -Method POST -Headers @{ apikey = $apiKey } -ContentType "application/json" -Body $payload | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri "$base/instance/fetchInstances" -Method GET -Headers @{ apikey = $apiKey } | ConvertTo-Json -Depth 6

$cwHeaders = @{ api_access_token = "eKWgQ3ZRf15fkspq7Grf3hdN" }
Invoke-RestMethod -Uri "http://<SEU_IP>:3000/api/v1/accounts/1/conversations" -Headers $cwHeaders -Method GET | ConvertTo-Json -Depth 6
```

### Dicas de conectividade
- Em containers, prefira `http://chatwoot-rails:3000`.
- Em hosts, use `http://<SEU_IP>:3000/`.
- Se usar proxy/túnel, garanta passagem do cabeçalho `apikey`.

---

## 📞 Suporte

### 🔗 URLs Importantes
- **Evolution API:** http://localhost:8080
- **Chatwoot:** http://localhost:3000
- **MinIO Console:** http://localhost:9001
- **Monitoramento:** `.\monitor-services.ps1`

### 🔑 Credenciais
- **API Key Evolution:** `evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456`

### ❌ **Problema: 404 no webhook**

Se você tentar acessar `GET/POST /webhook/chatwoot` no Evolution e receber `404 Not Found`, isso é esperado nesta build. Não é necessário configurar webhook na Inbox do Chatwoot. Em vez disso, configure a instância via `POST /chatwoot/set/<instância>` com `accountId`, `token` e `url` (use `http://chatwoot-rails:3000` dentro do Docker) e siga o PASSO 4 para conectar via QR.
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