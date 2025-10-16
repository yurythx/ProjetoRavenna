# 🚀 Stack ProjetoRavenna - Comunicação e Automação Empresarial

Esta stack oferece uma solução completa de comunicação multicanal e automação de processos, integrando WhatsApp, atendimento ao cliente, automação de fluxos e armazenamento seguro.

## 📋 Visão Geral

### Componentes da Stack
- **💬 Chatwoot**: Plataforma de atendimento ao cliente multicanal
- **📱 Evolution API**: Integração robusta com WhatsApp Business
- **🔄 N8N**: Automação de fluxos de trabalho e integrações
- **📦 MinIO**: Armazenamento de arquivos compatível com S3
- **🗄️ PostgreSQL**: Banco de dados relacional principal
- **⚡ Redis**: Cache e filas de processamento
- **🌐 Portainer**: Interface de gerenciamento Docker

### Arquitetura
- **Rede**: Todos os serviços compartilham a rede local `projetoravenna_default`
- **Volumes**: Dados persistidos em volumes locais Docker
- **Bancos de Dados**: PostgreSQL 16 para todos os serviços
- **Cache**: Redis 8.2 para sessões e filas
- **Armazenamento**: MinIO para arquivos e mídias

## 🚀 Início Rápido

### Pré-requisitos
- ✅ Docker Desktop (Windows) ou Docker Engine (Linux)
- ✅ Docker Compose v2+
- ✅ Portas disponíveis: 3000, 5678, 8080, 9000, 9001, 9002
- ✅ Mínimo 4GB RAM disponível

### Instalação e Execução
1. **Clone ou baixe o projeto**
2. **Configure as variáveis de ambiente** (veja seção abaixo)
3. **Execute a stack**:
```powershell
docker compose up -d
```

### Verificação do Status
```powershell
# Verificar containers em execução
docker compose ps

# Verificar logs de um serviço específico
docker compose logs chatwoot-rails --tail 50
```

## ⚙️ Configuração de Variáveis de Ambiente

### Estrutura de Arquivos .env
Cada serviço possui configurações específicas que devem ser ajustadas:

#### 📁 Configurações Principais

**IPs e URLs**: Substitua `192.168.1.74` pelo IP real do seu servidor em todos os arquivos:
- `chatwoot/.env`
- `evolution/.env`
- `n8n/.env`
- `minio/.env`

#### 📁 Chatwoot/.env
```env
# Configurações do Banco
DATABASE_URL=postgresql://postgres:SuaSenhaSegura123!@postgres_chatwoot:5432/chatwoot_production

# Configurações SMTP
SMTP_DOMAIN=gmail.com
SMTP_USERNAME=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app
SMTP_PORT=587
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true

# URLs e Domínios
FRONTEND_URL=http://SEU_IP:3000
RAILS_ENV=production
```

#### 📁 Evolution/.env
```env
# Configurações da API
AUTHENTICATION_API_KEY=evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456
SERVER_URL=http://SEU_IP:8080

# Configurações do Banco
DATABASE_CONNECTION_URI=postgresql://postgres:SuaSenhaSegura123!@postgres_evolution:5432/evolution

# Integração Chatwoot
CHATWOOT_BASE_URL=http://chatwoot-rails:3000
```

#### 📁 N8N/.env
```env
# Configurações do N8N
N8N_HOST=SEU_IP
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://SEU_IP:5678

# Configurações do Banco
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres_n8n
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=postgres
DB_POSTGRESDB_PASSWORD=SuaSenhaSegura123!
```

#### 📁 MinIO/.env
```env
# Credenciais do MinIO
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=SuaSenhaMinIOSegura123!

# URLs de acesso
MINIO_SERVER_URL=http://SEU_IP:9000
MINIO_BROWSER_REDIRECT_URL=http://SEU_IP:9001
```

> ⚠️ **IMPORTANTE**: Sempre altere as senhas padrão e substitua `SEU_IP` pelo IP real do servidor!

## 🌐 Acesso aos Serviços

| Serviço | URL Local | Porta | Credenciais/Configuração |
|---------|-----------|-------|--------------------------|
| **Chatwoot** | http://localhost:3000 | 3000 | Criar conta no primeiro acesso |
| **N8N** | http://localhost:5678 | 5678 | Criar conta no primeiro acesso |
| **Evolution API** | http://localhost:8080 | 8080 | API Key configurada no .env |
| **MinIO Console** | http://localhost:9001 | 9001 | Conforme MinIO/.env |
| **MinIO API** | http://localhost:9000 | 9000 | Para aplicações S3 |
| **Portainer** | http://localhost:9002 | 9002 | Criar conta no primeiro acesso |

### Primeiro Acesso

#### 💬 Chatwoot
1. Acesse http://localhost:3000
2. Crie uma conta de administrador
3. Configure sua primeira inbox (API Channel)
4. Anote o **Account ID** e **Access Token** para integração

#### 🔄 N8N
1. Acesse http://localhost:5678
2. Configure conta inicial
3. Importe workflows prontos
4. Configure credenciais para integrações

#### 📱 Evolution API
1. Acesse http://localhost:8080/manager
2. Use a API Key configurada no .env
3. Crie uma nova instância do WhatsApp
4. Escaneie o QR Code para conectar

#### 📦 MinIO
1. Acesse http://localhost:9001
2. Use as credenciais do MinIO/.env
3. Crie buckets necessários (chatwoot, n8n, evolution)
4. Configure políticas de acesso

## 🔧 Gerenciamento da Stack

### Comandos Básicos
```powershell
# Iniciar todos os serviços
docker compose up -d

# Parar todos os serviços
docker compose down

# Ver status dos containers
docker compose ps

# Ver logs de um serviço específico
docker compose logs [serviço] --tail 100

# Atualizar imagens e reiniciar
docker compose pull && docker compose up -d
```

### Ordem Recomendada de Inicialização
```powershell
# 1. Infraestrutura base
docker compose up -d postgres_chatwoot postgres_evolution postgres_n8n redis_chatwoot redis_evolution redis_n8n minio_server

# 2. Aguardar inicialização (30 segundos)
Start-Sleep -Seconds 30

# 3. Aplicações principais
docker compose up -d chatwoot-rails chatwoot-sidekiq evolution_api n8n_editor n8n_webhook n8n_worker

# 4. Gerenciamento
docker compose up -d ravenna_portainer
```

### Estrutura de Volumes
Os dados são persistidos em volumes locais Docker:
- `projetoravenna_postgres_chatwoot_data` - Dados do PostgreSQL (Chatwoot)
- `projetoravenna_postgres_evolution_data` - Dados do PostgreSQL (Evolution)
- `projetoravenna_postgres_n8n_data` - Dados do PostgreSQL (N8N)
- `projetoravenna_redis_chatwoot_data` - Dados do Redis (Chatwoot)
- `projetoravenna_redis_evolution_data` - Dados do Redis (Evolution)
- `projetoravenna_redis_n8n_data` - Dados do Redis (N8N)
- `projetoravenna_minio_data` - Dados do MinIO
- `projetoravenna_n8n_data` - Dados do N8N
- `projetoravenna_evolution_data` - Dados da Evolution API

## 🔗 Integração entre Serviços

### Conectar Evolution API ao Chatwoot

#### 1. Configurar Canal API no Chatwoot
1. Acesse **Configurações > Inboxes > Adicionar Inbox**
2. Selecione **API**
3. Configure:
   - **Nome**: `WhatsApp - Evolution API`
   - **URL do Webhook**: `http://evolution_api:8080/chatwoot/webhook/SuaInstancia`
4. Anote o **Access Token** gerado

#### 2. Configurar Evolution API
```powershell
# Configurar integração via API
$headers = @{ 'apikey' = 'evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456' }
$body = @{
    enabled = $true
    accountId = "1"  # ID da conta Chatwoot
    token = "SEU_ACCESS_TOKEN_CHATWOOT"
    url = "http://chatwoot-rails:3000"
    signMsg = $false
    reopenConversation = $true
    conversationPending = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/chatwoot/set/SuaInstancia" -Method POST -Headers $headers -ContentType "application/json" -Body $body
```

### Conectar N8N aos Serviços
1. No N8N, configure credenciais para:
   - **Chatwoot**: URL da API + Access Token
   - **Evolution API**: URL + API Key
   - **MinIO**: Endpoint + Access/Secret Keys
2. Crie workflows para automação de processos

### Rede Interna
Todos os serviços se comunicam através da rede `projetoravenna_default`:
- `chatwoot-rails` - Aplicação principal Chatwoot
- `chatwoot-sidekiq` - Processamento em background
- `evolution_api` - API do WhatsApp
- `n8n_editor` - Interface do N8N
- `n8n_webhook` - Receptor de webhooks
- `n8n_worker` - Executor de workflows
- `minio_server` - Servidor de arquivos
- `postgres_*` - Bancos de dados
- `redis_*` - Serviços de cache

## 💾 Backup e Restauração

### Backup dos Bancos de Dados

#### PostgreSQL (Chatwoot)
```powershell
# Criar backup
docker exec postgres_chatwoot pg_dump -U postgres -d chatwoot_production > backup_chatwoot_$(Get-Date -Format "yyyyMMdd_HHmm").sql

# Restaurar backup
docker exec -i postgres_chatwoot psql -U postgres -d chatwoot_production < backup_chatwoot_YYYYMMDD_HHMM.sql
```

#### PostgreSQL (Evolution)
```powershell
# Criar backup
docker exec postgres_evolution pg_dump -U postgres -d evolution > backup_evolution_$(Get-Date -Format "yyyyMMdd_HHmm").sql

# Restaurar backup
docker exec -i postgres_evolution psql -U postgres -d evolution < backup_evolution_YYYYMMDD_HHMM.sql
```

#### PostgreSQL (N8N)
```powershell
# Criar backup
docker exec postgres_n8n pg_dump -U postgres -d n8n > backup_n8n_$(Get-Date -Format "yyyyMMdd_HHmm").sql

# Restaurar backup
docker exec -i postgres_n8n psql -U postgres -d n8n < backup_n8n_YYYYMMDD_HHMM.sql
```

### Backup dos Volumes
```powershell
# Backup dos dados do MinIO
docker run --rm -v projetoravenna_minio_data:/data -v ${PWD}:/backup alpine tar czf /backup/minio_backup_$(Get-Date -Format "yyyyMMdd_HHmm").tar.gz -C /data .

# Backup dos dados do N8N
docker run --rm -v projetoravenna_n8n_data:/data -v ${PWD}:/backup alpine tar czf /backup/n8n_backup_$(Get-Date -Format "yyyyMMdd_HHmm").tar.gz -C /data .

# Backup dos dados da Evolution
docker run --rm -v projetoravenna_evolution_data:/data -v ${PWD}:/backup alpine tar czf /backup/evolution_backup_$(Get-Date -Format "yyyyMMdd_HHmm").tar.gz -C /data .
```

## 🛠️ Solução de Problemas

### Problemas Comuns

#### Chatwoot não carrega
```powershell
# Verificar logs
docker compose logs chatwoot-rails --tail 100

# Verificar banco de dados
docker compose logs postgres_chatwoot --tail 100

# Verificar se o banco foi inicializado
docker exec postgres_chatwoot psql -U postgres -l
```

#### Evolution API não conecta WhatsApp
```powershell
# Verificar logs
docker compose logs evolution_api --tail 100

# Verificar API Key
curl -H "apikey: evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456" http://localhost:8080/instance/fetchInstances

# Recriar instância se necessário
```

#### N8N workflows não executam
```powershell
# Verificar logs do worker
docker compose logs n8n_worker --tail 100

# Verificar conexão com banco
docker compose logs postgres_n8n --tail 100

# Verificar credenciais configuradas
```

#### MinIO inacessível
```powershell
# Verificar logs
docker compose logs minio_server --tail 100

# Verificar se as portas estão livres
netstat -an | findstr "9000\|9001"

# Testar conectividade
Test-NetConnection -ComputerName localhost -Port 9001
```

### Verificação de Saúde
```powershell
# Verificar se todos os containers estão saudáveis
docker compose ps

# Verificar uso de recursos
docker stats --no-stream

# Verificar volumes
docker volume ls | findstr projetoravenna

# Verificar conectividade entre serviços
docker exec chatwoot-rails ping postgres_chatwoot
docker exec evolution_api ping chatwoot-rails
```

## 🔒 Segurança

### Recomendações de Segurança
- ✅ Altere **todas** as senhas padrão nos arquivos .env
- ✅ Use senhas fortes (mínimo 16 caracteres)
- ✅ Configure HTTPS para acesso externo
- ✅ Use firewall para limitar acesso às portas
- ✅ Faça backups regulares e criptografados
- ✅ Mantenha as imagens Docker atualizadas
- ✅ Configure autenticação de dois fatores onde possível

### Configuração de Firewall
```powershell
# Permitir apenas portas necessárias (exemplo Windows Firewall)
New-NetFirewallRule -DisplayName "Chatwoot" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "N8N" -Direction Inbound -Protocol TCP -LocalPort 5678 -Action Allow
New-NetFirewallRule -DisplayName "Evolution API" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
New-NetFirewallRule -DisplayName "MinIO Console" -Direction Inbound -Protocol TCP -LocalPort 9001 -Action Allow
New-NetFirewallRule -DisplayName "Portainer" -Direction Inbound -Protocol TCP -LocalPort 9002 -Action Allow
```

### Exposição Segura
Para expor os serviços na internet, use um reverse proxy:
```nginx
# Exemplo de configuração Nginx
server {
    listen 443 ssl;
    server_name chatwoot.seudominio.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 📊 Monitoramento e Métricas

### Portainer - Interface de Gerenciamento
- **URL**: http://localhost:9002
- **Funcionalidades**:
  - Visualização de containers, volumes e redes
  - Logs centralizados
  - Monitoramento de recursos
  - Gerenciamento visual de stacks
  - Estatísticas de uso

### Comandos de Monitoramento
```powershell
# Status geral da stack
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Uso de recursos
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Verificar saúde dos serviços
docker inspect --format='{{.Name}}: {{.State.Health.Status}}' $(docker ps -q)

# Logs agregados
docker compose logs --tail=50 --follow
```

## 📚 Recursos Adicionais

### Documentação Oficial
- [Chatwoot Documentation](https://www.chatwoot.com/docs/)
- [Evolution API Documentation](https://doc.evolution-api.com/)
- [N8N Documentation](https://docs.n8n.io/)
- [MinIO Documentation](https://min.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

### Estrutura do Projeto
```
ProjetoRavenna/
├── docker-compose.yml          # Orquestração principal
├── README.md                   # Esta documentação
├── chatwoot/
│   ├── .env                   # Configurações Chatwoot
│   ├── .env.example          # Template de configuração
│   └── chatwoot.yml          # Compose específico
├── evolution/
│   ├── .env                  # Configurações Evolution API
│   ├── .env.example         # Template de configuração
│   └── evolution.yml        # Compose específico
├── n8n/
│   ├── .env                 # Configurações N8N
│   ├── .env.example        # Template de configuração
│   └── n8n.yml             # Compose específico
├── minio/
│   ├── .env                # Configurações MinIO
│   ├── .env.example       # Template de configuração
│   └── minio.yml          # Compose específico
├── postgres/
│   └── postgres.yml       # Bancos PostgreSQL
├── redis/
│   └── redis.yml          # Serviços Redis
└── portainer/
    └── portainer.yml      # Interface de gerenciamento
```

## 🎯 Casos de Uso

### Atendimento ao Cliente
1. **Recepção**: Mensagens WhatsApp chegam via Evolution API
2. **Roteamento**: Chatwoot distribui para agentes disponíveis
3. **Atendimento**: Agentes respondem via interface web
4. **Automação**: N8N processa regras de negócio
5. **Armazenamento**: Mídias salvas no MinIO

### Automação de Processos
1. **Triggers**: Webhooks recebidos pelo N8N
2. **Processamento**: Workflows executam lógica de negócio
3. **Integrações**: Conecta com sistemas externos
4. **Notificações**: Envia mensagens via Evolution API
5. **Logs**: Registra atividades no banco de dados

### Gestão de Arquivos
1. **Upload**: Clientes enviam arquivos via WhatsApp
2. **Armazenamento**: MinIO salva com políticas de acesso
3. **Processamento**: N8N pode processar automaticamente
4. **Distribuição**: Links seguros para download
5. **Backup**: Replicação automática para segurança

## 🚀 Próximos Passos

### Melhorias Recomendadas
- [ ] Implementar SSL/TLS para todos os serviços
- [ ] Configurar backup automático agendado
- [ ] Implementar monitoramento com alertas
- [ ] Configurar load balancer para alta disponibilidade
- [ ] Implementar autenticação SSO
- [ ] Configurar logs centralizados (ELK Stack)

### Integrações Futuras
- [ ] CRM (Pipedrive, HubSpot)
- [ ] ERP (Odoo, SAP)
- [ ] Pagamentos (Stripe, PagSeguro)
- [ ] Analytics (Google Analytics, Mixpanel)
- [ ] Telefonia (Twilio, Asterisk)

---

> 💡 **Dica**: Esta stack foi configurada para usar volumes e redes locais, garantindo isolamento e facilidade de deploy. Todos os dados são persistidos automaticamente nos volumes Docker.

> ⚠️ **Importante**: Sempre teste as configurações em ambiente de desenvolvimento antes de aplicar em produção. Mantenha backups regulares de todos os dados críticos.