# 🔗 Guia de Integração - Projeto Ravenna

## 📋 Visão Geral

Este guia detalha como integrar o **Chatwoot** (plataforma de atendimento) com a **Evolution API** (API WhatsApp) no Projeto Ravenna, permitindo:

- ✅ Recebimento automático de mensagens WhatsApp no Chatwoot
- ✅ Envio de mensagens do Chatwoot para WhatsApp
- ✅ Sincronização de contatos e conversas
- ✅ Histórico completo de conversas
- ✅ Múltiplas instâncias WhatsApp

## 🔧 Pré-requisitos

### Serviços Necessários
- PostgreSQL (banco compartilhado)
- Redis (cache compartilhado)
- Evolution API (funcionando)
- Chatwoot (funcionando)

### Verificação Inicial
```bash
# Verificar se todos os serviços estão rodando
docker ps

# Verificar conectividade entre serviços
docker exec evolution_api ping -c 3 postgres
docker exec evolution_api ping -c 3 redis
```

## 🚀 Configuração do Evolution API

### Arquivo `evolution/.env`
```env
# Integração com Chatwoot
CHATWOOT_ENABLED=true
CHATWOOT_MESSAGE_READ=true

# Banco de dados compartilhado
CHATWOOT_IMPORT_DATABASE_CONNECTION_URI=postgresql://postgres:SuaSenhaSegura123!@postgres:5432/chatwoot?sslmode=disable

# API Key para autenticação
AUTHENTICATION_API_KEY=SuaChaveEvolution123!

# Eventos de webhook ativados
WEBHOOK_EVENTS_QRCODE_UPDATED=true
WEBHOOK_EVENTS_MESSAGES_UPSERT=true
WEBHOOK_EVENTS_MESSAGES_UPDATE=true
WEBHOOK_EVENTS_SEND_MESSAGE=true
WEBHOOK_EVENTS_CONTACTS_UPSERT=true
WEBHOOK_EVENTS_CONNECTION_UPDATE=true
```

### URL Base da Evolution
```env
SERVER_URL=http://192.168.1.100:8080
```

## 🎨 Configuração do Chatwoot

### Arquivo `chatwoot/.env`
```env
# Banco PostgreSQL compartilhado
POSTGRES_HOST=postgres
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=SuaSenhaSegura123!
POSTGRES_DATABASE=chatwoot

# Redis compartilhado
REDIS_URL=redis://redis:6379

# URL base do Chatwoot
FRONTEND_URL=http://192.168.1.100:3000

# Armazenamento local
ACTIVE_STORAGE_SERVICE=local
```

## 🔗 Integração Passo a Passo

### 1. Criar Instância WhatsApp
```bash
# Criar nova instância
curl -X POST "http://localhost:8080/instance/create" \
  -H "apikey: SuaChaveEvolution123!" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "Ravenna",
    "integration": "WHATSAPP-BAILEYS"
  }'
```

### 2. Configurar Integração Chatwoot
```bash
curl -X POST "http://localhost:8080/chatwoot/set/Ravenna" \
  -H "apikey: SuaChaveEvolution123!" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "accountId": "1",
    "token": "SEU_TOKEN_CHATWOOT",
    "url": "http://chatwoot-rails:3000",
    "signMsg": false,
    "reopenConversation": true,
    "conversationPending": false
  }'
```

### 3. Obter QR Code
```bash
# Conectar instância e obter QR Code
curl -H "apikey: SuaChaveEvolution123!" \
  "http://localhost:8080/instance/connect/Ravenna"
```

### 4. Configurar Inbox no Chatwoot
1. Acesse: `http://localhost:3000`
2. Vá em **Configurações** → **Inboxes** → **Adicionar Inbox**
3. Selecione **API**
4. Configure:
   - **Nome**: WhatsApp Ravenna
   - **URL do Webhook**: `http://evolution_api:8080/chatwoot/webhook/Ravenna`

### 5. Obter Token de Acesso
1. No Chatwoot, vá em **Configurações** → **Integrações** → **API Access Tokens**
2. Crie um novo token ou use um existente
3. Use este token na configuração da Evolution API

## ✅ Verificação da Integração

### Teste de Conectividade
```bash
# Verificar status da instância
curl -H "apikey: SuaChaveEvolution123!" \
  "http://localhost:8080/instance/fetchInstances"

# Verificar se status é "open" (conectado)
```

### Teste de Mensagens
1. Envie uma mensagem para o WhatsApp conectado
2. Verifique se aparece no Chatwoot
3. Responda pelo Chatwoot
4. Verifique se chega no WhatsApp

### Verificar Logs
```bash
# Logs do Evolution API
docker logs evolution_api --tail 20

# Logs do Chatwoot
docker logs chatwoot-rails --tail 20
docker logs chatwoot-sidekiq --tail 20
```

## 🚨 Solução de Problemas

### Instância não conecta
```bash
# Reiniciar instância
curl -X PUT "http://localhost:8080/instance/restart/Ravenna" \
  -H "apikey: SuaChaveEvolution123!"

# Verificar logs
docker logs evolution_api --tail 50

# Recriar instância se necessário
curl -X DELETE "http://localhost:8080/instance/delete/Ravenna" \
  -H "apikey: SuaChaveEvolution123!"
```

### Mensagens não chegam no Chatwoot
```bash
# Verificar configuração da instância
curl -H "apikey: SuaChaveEvolution123!" \
  "http://localhost:8080/instance/fetchInstances"

# Verificar conectividade
docker exec evolution_api ping -c 3 chatwoot-rails

# Verificar banco de dados
docker exec postgres_chatwoot psql -U postgres -d chatwoot -c "SELECT * FROM inboxes;"
```

### Problemas de Mídia
```bash
# Verificar logs dos serviços
docker logs chatwoot-rails --tail 20
docker logs evolution_api --tail 20

# Testar conectividade
curl -I http://localhost:3000
curl -I http://localhost:8080
```

## 🔧 Configurações Avançadas

### Múltiplas Instâncias
```bash
# Criar segunda instância
curl -X POST "http://localhost:8080/instance/create" \
  -H "apikey: SuaChaveEvolution123!" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "Vendas",
    "integration": "WHATSAPP-BAILEYS"
  }'

# Configurar Chatwoot para segunda instância
curl -X POST "http://localhost:8080/chatwoot/set/Vendas" \
  -H "apikey: SuaChaveEvolution123!" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "accountId": "1",
    "token": "SEU_TOKEN_CHATWOOT",
    "url": "http://chatwoot-rails:3000",
    "signMsg": false,
    "reopenConversation": true,
    "conversationPending": false
  }'
```

### Personalização de Mensagens
```env
# Arquivo: evolution/.env
CONFIG_SESSION_PHONE_CLIENT=Projeto Ravenna
CONFIG_SESSION_PHONE_NAME=Atendimento
CHATWOOT_MESSAGE_READ=true
```

## 📊 Monitoramento

### Comandos de Verificação
```bash
# Status das instâncias
curl -H "apikey: SuaChaveEvolution123!" \
  "http://localhost:8080/instance/fetchInstances"

# Conversas no Chatwoot
curl "http://localhost:3000/api/v1/accounts/1/conversations?api_access_token=SEU_TOKEN"

# Status dos containers
docker ps
docker stats
```

### Métricas Importantes
- **Conexão WhatsApp**: Status deve ser `open`
- **Mensagens**: Logs sem erros
- **Inbox Chatwoot**: Ativo e recebendo mensagens
- **Banco de dados**: Conexões estáveis
- **Cache Redis**: Funcionando

## ✅ Checklist de Integração

### Pré-Integração
- [ ] Todos os containers rodando
- [ ] Rede Docker criada (`app_network`)
- [ ] PostgreSQL acessível
- [ ] Redis funcionando

### Configuração Evolution API
- [ ] `CHATWOOT_ENABLED=true`
- [ ] API Key configurada
- [ ] Banco Chatwoot configurado
- [ ] Webhooks ativados

### Configuração Chatwoot
- [ ] PostgreSQL conectado
- [ ] Redis conectado
- [ ] Interface acessível
- [ ] Token de acesso criado

### Integração
- [ ] Instância WhatsApp criada
- [ ] QR Code escaneado
- [ ] Status "open"
- [ ] Inbox configurada
- [ ] Webhook configurado

### Testes
- [ ] Mensagens recebidas no Chatwoot
- [ ] Mensagens enviadas pelo Chatwoot
- [ ] Mídia funcionando
- [ ] Logs sem erros

## 📞 Suporte

### URLs Importantes
- **Evolution API**: http://localhost:8080
- **Chatwoot**: http://localhost:3000

### Comandos Úteis
```bash
# Reiniciar serviços
docker compose restart evolution_api
docker compose restart chatwoot-rails

# Verificar logs
docker logs evolution_api --follow
docker logs chatwoot-rails --follow

# Backup do banco
docker exec postgres_chatwoot pg_dump -U postgres chatwoot > backup_chatwoot.sql
```

### Problemas Comuns
1. **Timeout ao responder**: Verificar URL do webhook
2. **Instância desconectada**: Reescanear QR Code
3. **Mensagens não chegam**: Verificar token e accountId
4. **Mídia não funciona**: Verificar armazenamento local

---

**Projeto Ravenna** - Guia de Integração Consolidado