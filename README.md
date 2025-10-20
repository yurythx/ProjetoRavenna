# 📱 Projeto Ravenna - Stack de Comunicação Empresarial

Uma solução completa de comunicação multicanal e automação de processos, integrando WhatsApp, atendimento ao cliente e automação de fluxos.

## 🎯 Visão Geral

### Componentes da Stack
- **💬 Chatwoot**: Plataforma de atendimento ao cliente multicanal
- **📱 Evolution API**: Integração robusta com WhatsApp Business
- **🔄 N8N**: Automação de fluxos de trabalho e integrações
- **🗄️ PostgreSQL**: Banco de dados relacional principal
- **⚡ Redis**: Cache e filas de processamento
- **🌐 Portainer**: Interface de gerenciamento Docker

### Arquitetura
- **Rede**: Todos os serviços compartilham a rede `app_network`
- **Volumes**: Dados persistidos em volumes Docker locais
- **Bancos de Dados**: PostgreSQL 16 para todos os serviços
- **Cache**: Redis para sessões e filas
- **Armazenamento**: Sistema de arquivos local para mídias

## 🚀 Início Rápido

### Pré-requisitos
- Docker Desktop (Windows) ou Docker Engine (Linux)
- Docker Compose v2+
- Portas disponíveis: 3000, 5678, 8080, 9002
- Mínimo 4GB RAM disponível

### Instalação
```bash
# 1. Clone o repositório
git clone [url-do-repositorio]
cd ProjetoRavenna

# 2. Configure as variáveis de ambiente
# Edite os arquivos .env em cada pasta de serviço

# 3. Inicie a stack
docker compose up -d

# 4. Verifique o status
docker ps
```

## 🌐 Acesso aos Serviços

| Serviço | URL | Porta | Descrição |
|---------|-----|-------|-----------|
| **Chatwoot** | http://localhost:3000 | 3000 | Plataforma de atendimento |
| **Evolution API** | http://localhost:8080 | 8080 | API WhatsApp |
| **N8N** | http://localhost:5678 | 5678 | Automação de workflows |
| **Portainer** | http://localhost:9002 | 9002 | Gerenciamento Docker |

## ⚙️ Configuração

### Variáveis de Ambiente Essenciais

#### PostgreSQL
```env
POSTGRES_PASSWORD=SuaSenhaSegura123!
POSTGRES_PORT=5432
```

#### Redis
```env
REDIS_PASSWORD=SuaSenhaRedis123!
REDIS_PORT=6379
```

#### Chatwoot
```env
# SMTP
SMTP_USERNAME=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app

# Segurança
SECRET_KEY_BASE=$(openssl rand -hex 64)
FRONTEND_URL=http://192.168.1.100:3000

# Armazenamento
ACTIVE_STORAGE_SERVICE=local
```

#### Evolution API
```env
SERVER_URL=http://192.168.1.100:8080
AUTHENTICATION_API_KEY=SuaChaveEvolution123!
DATABASE_CONNECTION_URI=postgresql://postgres:SuaSenhaSegura123!@postgres:5432/evolution
```

#### N8N
```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=N8nAdmin123!
```

> ⚠️ **IMPORTANTE**: Substitua `192.168.1.100` pelo IP real do seu servidor e altere todas as senhas padrão!

## 🔗 Integração Chatwoot + Evolution API

### Configuração Rápida
1. **Chatwoot**: Crie uma Inbox API em Configurações → Inboxes
2. **Webhook URL**: `http://evolution_api:8080/chatwoot/webhook/SuaInstancia`
3. **Evolution API**: Configure a integração via API:

```bash
curl -X POST "http://localhost:8080/chatwoot/set/SuaInstancia" \
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

## 🛠️ Gerenciamento

### Comandos Básicos
```bash
# Iniciar todos os serviços
docker compose up -d

# Parar todos os serviços
docker compose down

# Ver status
docker compose ps

# Ver logs
docker compose logs [serviço] --tail 100

# Atualizar
docker compose pull && docker compose up -d
```

### Monitoramento
```bash
# Status dos containers
docker ps

# Uso de recursos
docker stats

# Logs em tempo real
docker compose logs -f
```

## 💾 Backup

### Backup dos Bancos
```bash
# PostgreSQL
docker exec postgres_chatwoot pg_dumpall -U postgres > backup_$(date +%Y%m%d).sql

# Volumes
docker run --rm -v projetoravenna_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/volumes_backup_$(date +%Y%m%d).tar.gz /data
```

## 🚨 Solução de Problemas

### Problemas Comuns

#### Container não inicia
```bash
# Ver logs detalhados
docker logs nome_do_container

# Verificar recursos
df -h && free -h

# Reiniciar
docker restart nome_do_container
```

#### Porta em uso
```bash
# Verificar processo
sudo netstat -tulpn | grep :porta

# Alterar porta no .env ou parar processo
```

#### Problemas de conectividade
```bash
# Testar conectividade entre containers
docker exec evolution_api ping chatwoot-rails
docker exec chatwoot-rails ping postgres
```

## 🔐 Segurança

### Configurações Essenciais
- Altere todas as senhas padrão
- Configure firewall para limitar acesso
- Use HTTPS para acesso externo
- Mantenha backups regulares
- Atualize imagens regularmente

### Firewall (Linux)
```bash
sudo ufw allow 3000/tcp  # Chatwoot
sudo ufw allow 5678/tcp  # N8N
sudo ufw allow 8080/tcp  # Evolution API
sudo ufw allow 9002/tcp  # Portainer
```

## 📊 Estrutura do Projeto

```
ProjetoRavenna/
├── docker-compose.yml          # Orquestração principal
├── README.md                   # Documentação principal
├── INSTALLATION_GUIDE.md       # Guia de instalação detalhado
├── INTEGRATION_GUIDE.md        # Guia de integração Chatwoot + Evolution
├── DEPLOY_PRODUCTION.md        # Guia de deploy em produção
├── chatwoot/
│   ├── .env                   # Configurações Chatwoot
│   └── docker-compose.yml    # Compose específico
├── evolution/
│   ├── .env                  # Configurações Evolution API
│   └── docker-compose.yml   # Compose específico
├── n8n/
│   ├── .env                 # Configurações N8N
│   └── docker-compose.yml  # Compose específico
├── postgres/
│   └── docker-compose.yml  # Bancos PostgreSQL
├── redis/
│   └── docker-compose.yml  # Serviços Redis
└── portainer/
    └── docker-compose.yml  # Interface de gerenciamento
```

## 📚 Documentação

### Guias Disponíveis
- **[INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)**: Instalação detalhada passo a passo
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)**: Integração Chatwoot + Evolution API
- **[DEPLOY_PRODUCTION.md](DEPLOY_PRODUCTION.md)**: Deploy em produção com segurança

### Recursos Externos
- [Chatwoot Documentation](https://www.chatwoot.com/docs/)
- [Evolution API Documentation](https://doc.evolution-api.com/)
- [N8N Documentation](https://docs.n8n.io/)

## 🎯 Casos de Uso

### Atendimento ao Cliente
1. Mensagens WhatsApp → Evolution API → Chatwoot
2. Agentes respondem via interface web
3. N8N automatiza processos e integrações
4. Histórico completo armazenado no PostgreSQL

### Automação de Processos
1. Webhooks recebidos pelo N8N
2. Workflows executam lógica de negócio
3. Integrações com sistemas externos
4. Notificações via WhatsApp

## ✅ Checklist de Instalação

- [ ] Docker e Docker Compose instalados
- [ ] Repositório clonado
- [ ] Arquivos `.env` configurados
- [ ] Senhas alteradas
- [ ] Rede Docker criada
- [ ] Serviços iniciados
- [ ] URLs acessíveis
- [ ] Integração Chatwoot + Evolution testada
- [ ] Backup configurado

## 📞 Suporte

### Verificação de Status
```bash
# Script de monitoramento (Linux)
./scripts/monitor-services.sh

# Script de monitoramento (Windows)
.\monitor-services.ps1
```

### Comandos Úteis
```bash
# Reiniciar serviços específicos
docker compose restart chatwoot-rails evolution_api

# Limpar recursos não utilizados
docker system prune -a

# Verificar logs de erro
docker compose logs | grep -i error
```

---

**Projeto Ravenna** - Stack de Comunicação Empresarial Completa

> 💡 **Dica**: Para instalação detalhada, consulte o [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)  
> 🔗 **Integração**: Para configurar Chatwoot + Evolution, veja [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)  
> 🚀 **Produção**: Para deploy seguro, consulte [DEPLOY_PRODUCTION.md](DEPLOY_PRODUCTION.md)
