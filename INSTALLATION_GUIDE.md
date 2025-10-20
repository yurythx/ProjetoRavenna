# 🛠️ Guia de Instalação - Projeto Ravenna

## 📋 Pré-requisitos

### Sistema Operacional
- **Ubuntu Server 20.04 LTS** ou superior (recomendado: 22.04 LTS)
- **Windows 10/11** com Docker Desktop
- Mínimo 4GB RAM, 20GB de espaço em disco
- Usuário com privilégios administrativos

### Dependências
- Docker Engine 24.0+
- Docker Compose v2.0+
- Git
- Curl/Wget

## 🚀 Instalação Rápida

### Windows

1. **Clone o repositório**
```powershell
git clone [url-do-repositorio]
cd ProjetoRavenna
```

2. **Configure as variáveis de ambiente**
   - Revise e ajuste os arquivos `.env` em cada pasta de serviço
   - Certifique-se de que as portas não estão em uso

3. **Inicie os serviços**
```powershell
# Criar rede externa (se não existir)
docker network create app_network || true

# Iniciar todos os serviços
docker compose up -d

# Verificar status
.\monitor-services.ps1
```

### Linux (Ubuntu)

1. **Preparação do ambiente**
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y docker.io docker-compose-plugin git curl

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

2. **Clone e configuração**
```bash
git clone [url-do-repositorio]
cd ProjetoRavenna
chmod +x *.sh
```

3. **Inicialização dos serviços**
```bash
# Criar rede Docker
docker network create app_network

# Iniciar todos os serviços
docker compose up -d

# Verificar status
docker ps
```

## 🔧 Configuração das Variáveis de Ambiente

### PostgreSQL (`postgres/.env`)
```env
POSTGRES_PASSWORD=SuaSenhaSegura123!
POSTGRES_PORT=5432
POSTGRES_CONTAINER=postgres_chatwoot
```

### Redis (`redis/.env`)
```env
REDIS_PASSWORD=SuaSenhaRedis123!
REDIS_PORT=6379
```

### Chatwoot (`chatwoot/.env`)
```env
# SMTP (Gmail exemplo)
SMTP_USERNAME=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app

# Segurança
SECRET_KEY_BASE=$(openssl rand -hex 64)
FRONTEND_URL=http://192.168.1.100:3000

# Banco de dados
POSTGRES_PASSWORD=SuaSenhaSegura123!

# Redis
REDIS_PASSWORD=SuaSenhaRedis123!

# Armazenamento local
ACTIVE_STORAGE_SERVICE=local
```

### N8N (`n8n/.env`)
```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=N8nAdmin123!

# Banco de dados
DB_POSTGRESDB_PASSWORD=SuaSenhaSegura123!
```

### Evolution API (`evolution/.env`)
```env
SERVER_URL=http://192.168.1.100:8080
DATABASE_CONNECTION_URI=postgresql://postgres:SuaSenhaSegura123!@postgres:5432/evolution
AUTHENTICATION_API_KEY=SuaChaveEvolution123!
```

## 🔍 Verificação da Instalação

### URLs de Acesso
Substitua `<SEU_IP>` pelo IP do servidor:
- **Chatwoot**: http://`<SEU_IP>`:3000
- **Evolution API**: http://`<SEU_IP>`:8080
- **N8N**: http://`<SEU_IP>`:5678
- **Portainer**: http://`<SEU_IP>`:9002

### Comandos de Verificação
```bash
# Status dos containers
docker ps

# Logs dos serviços
docker logs chatwoot-rails
docker logs evolution_api
docker logs n8n_editor

# Teste de conectividade
curl -I http://localhost:3000  # Chatwoot
curl -I http://localhost:8080  # Evolution API
curl -I http://localhost:5678  # N8N
```

## 🌐 Configuração Inicial dos Serviços

### 1. Chatwoot
1. Acesse: `http://seu-ip:3000`
2. Crie conta de administrador
3. Configure integração com WhatsApp via Evolution API

### 2. N8N
1. Acesse: `http://seu-ip:5678`
2. Use credenciais configuradas no `.env`
3. Configure conexões com banco de dados

### 3. Evolution API
1. Acesse: `http://seu-ip:8080`
2. Use a API Key configurada no `.env`
3. Crie instâncias do WhatsApp

## 🔗 Integração Chatwoot ↔ Evolution

### Configuração do Webhook
Configure na UI do Chatwoot (Inboxes → API):
- **URL do Webhook**: `http://evolution_api:8080/chatwoot/webhook/<instância>`
- Para acesso externo: `http://<SEU_IP>:8080/chatwoot/webhook/<instância>`

### Configuração da Instância
```bash
curl -X POST "http://<SEU_IP>:8080/chatwoot/set/Ravenna" \
  -H "apikey: <SUA_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "accountId": "1",
    "token": "<SEU_TOKEN>",
    "url": "http://chatwoot-rails:3000",
    "signMsg": false,
    "reopenConversation": true,
    "conversationPending": false
  }'
```

## 🚨 Solução de Problemas

### Container não inicia
```bash
# Ver logs detalhados
docker logs nome_do_container

# Verificar recursos
df -h && free -h

# Reiniciar container
docker restart nome_do_container
```

### Porta em uso
```bash
# Verificar processo usando a porta
sudo netstat -tulpn | grep :porta

# Parar processo ou alterar porta no .env
```

### Erro de permissão
```bash
# Corrigir permissões
sudo chown -R $USER:$USER .
```

## 🔐 Configurações de Segurança

### Firewall (Linux)
```bash
# Habilitar UFW
sudo ufw enable

# Permitir portas necessárias
sudo ufw allow ssh
sudo ufw allow 3000/tcp  # Chatwoot
sudo ufw allow 5678/tcp  # N8N
sudo ufw allow 8080/tcp  # Evolution API
sudo ufw allow 9002/tcp  # Portainer

# Verificar status
sudo ufw status
```

### Senhas que devem ser alteradas
- PostgreSQL: `POSTGRES_PASSWORD`
- Redis: `REDIS_PASSWORD`
- N8N: `N8N_BASIC_AUTH_PASSWORD`
- Evolution API: `AUTHENTICATION_API_KEY`
- Chatwoot: `SECRET_KEY_BASE`

## 📊 Monitoramento

### Scripts de Monitoramento
```bash
# Status geral (Linux)
./scripts/monitor-services.sh status

# Status geral (Windows)
.\monitor-services.ps1

# Logs de todos os serviços
docker compose logs -f
```

### Backup Manual
```bash
# Backup dos dados
docker exec postgres_chatwoot pg_dumpall -U postgres > backup_$(date +%Y%m%d).sql

# Backup dos volumes
docker run --rm -v projetoravenna_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/volumes_backup_$(date +%Y%m%d).tar.gz /data
```

## ✅ Checklist de Instalação

- [ ] Sistema atualizado
- [ ] Docker e Docker Compose instalados
- [ ] Repositório clonado
- [ ] Arquivos `.env` configurados
- [ ] Rede Docker criada
- [ ] Serviços iniciados com sucesso
- [ ] URLs acessíveis
- [ ] Senhas padrão alteradas
- [ ] Firewall configurado
- [ ] Integração Chatwoot ↔ Evolution testada

## 📞 Suporte

Em caso de problemas:
1. Consulte os logs: `docker compose logs`
2. Verifique o status: `docker ps`
3. Consulte a documentação específica de cada serviço
4. Verifique as configurações de rede e firewall

---

**Projeto Ravenna** - Guia de Instalação Consolidado