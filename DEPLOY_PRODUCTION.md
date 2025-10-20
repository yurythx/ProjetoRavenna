# 🚀 DEPLOY PRODUÇÃO - PROJETO RAVENNA

## 📋 Visão Geral

Este guia consolidado cobre todo o processo de deploy em produção do Projeto Ravenna, incluindo:
- ✅ Deploy no Ubuntu 24.04 + aaPanel
- ✅ Checklist completo de verificação
- ✅ Configurações de segurança obrigatórias
- ✅ Monitoramento e troubleshooting

---

## 🔐 CONFIGURAÇÕES DE SEGURANÇA (CRÍTICO)

### ⚠️ IMPORTANTE - LEIA ANTES DE USAR EM PRODUÇÃO

**Total de credenciais a alterar**: 12 itens críticos  
**Tempo estimado de configuração**: 15-30 minutos  
**Nível de risco com credenciais padrão**: 🔴 **CRÍTICO**

### 🚨 Credenciais Obrigatórias para Alterar

#### 1. 🗄️ Banco de Dados PostgreSQL
```yaml
POSTGRES_PASSWORD: minha_senha  # ❌ ALTERAR OBRIGATÓRIO
```
**Arquivos que referenciam**: `chatwoot/.env`, `n8n/.env`, `evolution/.env`

#### 2. 🔑 Chatwoot
```yaml
SECRET_KEY_BASE: "chave_unica"   # ❌ ALTERAR OBRIGATÓRIO
SMTP_PASSWORD: sua_senha         # ❌ CONFIGURAR OBRIGATÓRIO
```
**Gerar SECRET_KEY_BASE**: `openssl rand -hex 64`

#### 3. ⚙️ N8N
```yaml
N8N_ENCRYPTION_KEY: Y8Dmy5FhuRIDGIrs  # ❌ ALTERAR OBRIGATÓRIO
```
**Gerar chave**: `openssl rand -base64 32`

#### 4. 📱 Evolution API
```yaml
AUTHENTICATION_API_KEY: ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f  # ❌ ALTERAR OBRIGATÓRIO
```

#### 5. 📧 Configuração SMTP
```yaml
SMTP_DOMAIN: smtp.gmail.com
SMTP_PORT: 587
SMTP_USERNAME: seu-email@gmail.com  # ❌ CONFIGURAR OBRIGATÓRIO
SMTP_PASSWORD: sua_senha           # ❌ CONFIGURAR OBRIGATÓRIO
```

---

## 🖥️ PRÉ-REQUISITOS DO SERVIDOR

### Sistema Operacional
- **Ubuntu 24.04 LTS** (recomendado)
- **IP do servidor**: Configure seu IP (ex: `192.168.0.121`)
- **aaPanel** instalado e configurado
- **Mínimo**: 4GB RAM, 20GB disco, usuário sudo

### Dependências Necessárias
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y

# Reiniciar para aplicar permissões
sudo reboot
```

### Configuração de Firewall
```bash
# Permitir portas necessárias
sudo ufw allow 3000/tcp    # Chatwoot
sudo ufw allow 8080/tcp    # Evolution API
sudo ufw allow 9002/tcp    # Portainer
sudo ufw allow 5678/tcp    # n8n
sudo ufw enable
```

---

## ✅ CHECKLIST DE DEPLOY

### 📋 Pré-Deploy

#### Sistema Base
- [ ] Ubuntu 24.04 LTS instalado
- [ ] IP configurado corretamente
- [ ] aaPanel instalado e funcionando
- [ ] Acesso SSH configurado
- [ ] Usuário com privilégios sudo

#### Dependências Docker
- [ ] Docker instalado
- [ ] Docker Compose instalado
- [ ] Usuário adicionado ao grupo docker
- [ ] Sistema reiniciado

#### Firewall
- [ ] Portas liberadas no firewall (3000, 8080, 9002, 5678)
- [ ] UFW ativado

### 🌐 Configuração aaPanel

#### Domínios (Opcional - para SSL)
- [ ] `chatwoot.seudominio.com` criado
- [ ] `evolution.seudominio.com` criado
- [ ] `portainer.seudominio.com` criado
- [ ] `n8n.seudominio.com` criado

#### Reverse Proxy
- [ ] Chatwoot: `127.0.0.1:3000`
- [ ] Evolution: `127.0.0.1:8080`
- [ ] Portainer: `127.0.0.1:9002`
- [ ] n8n: `127.0.0.1:5678`

#### SSL (Se usando domínios)
- [ ] Certificados SSL configurados
- [ ] Force HTTPS ativado
- [ ] Redirecionamento HTTP → HTTPS

### 📁 Preparação dos Arquivos

#### No Servidor Ubuntu
```bash
cd /opt
sudo git clone seu_repositorio projeto-ravenna
cd projeto-ravenna
sudo chown -R $USER:$USER .
```
- [ ] Projeto clonado/copiado para `/opt/projeto-ravenna`
- [ ] Permissões ajustadas

#### Configuração .env
```bash
cp .env.ubuntu .env
nano .env
```
- [ ] Arquivo `.env.ubuntu` copiado para `.env`
- [ ] `HOST_IP` configurado com IP do servidor
- [ ] URLs atualizadas (domínios ou IPs)
- [ ] SMTP configurado com provedor real
- [ ] **TODAS as senhas alteradas** (PostgreSQL, Chatwoot, N8N, Evolution)
- [ ] Tokens de segurança alterados

---

## 🚀 PROCESSO DE DEPLOY

### 1. Preparação
```bash
# Clonar/copiar projeto para o servidor
cd /opt
sudo git clone seu_repositorio projeto-ravenna
cd projeto-ravenna
sudo chown -R $USER:$USER .
```

### 2. Configuração de Rede Docker
```bash
# Criar rede antes de iniciar os serviços
docker network create app_network
```
- [ ] Rede `app_network` criada

### 3. Infraestrutura Base
```bash
docker compose up -d postgres_chatwoot postgres_n8n postgres_evolution redis_chatwoot redis_n8n redis_evolution
```
- [ ] Bancos PostgreSQL iniciados
- [ ] Redis iniciados
- [ ] Aguardado 60 segundos para inicialização

### 4. Serviços Principais
```bash
docker compose up -d chatwoot-rails chatwoot-sidekiq n8n evolution_api
```
- [ ] Chatwoot iniciado
- [ ] n8n iniciado
- [ ] Evolution API iniciado

### 5. Serviços Auxiliares
```bash
docker compose up -d portainer
# Se usar Cloudflare:
# docker compose up -d cloudflared
```
- [ ] Portainer iniciado
- [ ] Cloudflare iniciado (se aplicável)

---

## 🌐 INTEGRAÇÃO COM aaPanel

### 1. Configuração de Reverse Proxy

#### Para Chatwoot (porta 3000)
```nginx
# No aaPanel > Website > Reverse Proxy
# Target URL: http://127.0.0.1:3000

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_cache_bypass $http_upgrade;
}
```

#### Para Evolution API (porta 8080)
```nginx
# Target URL: http://127.0.0.1:8080
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

### 2. Configuração SSL no aaPanel
- Acesse **aaPanel > Website > SSL**
- Configure certificados SSL para cada domínio
- Ative **Force HTTPS** após configurar SSL

---

## 🔍 VERIFICAÇÃO E TESTES

### Status dos Containers
```bash
docker compose ps
```
- [ ] Todos os containers com status "Up"
- [ ] Nenhum container com status "Exited"

### Testes de Conectividade
- [ ] Chatwoot: `http://SEU_IP:3000` ou `https://chatwoot.seudominio.com`
- [ ] Evolution: `http://SEU_IP:8080` ou `https://evolution.seudominio.com`
- [ ] Portainer: `http://SEU_IP:9002` ou `https://portainer.seudominio.com`
- [ ] n8n: `http://SEU_IP:5678` ou `https://n8n.seudominio.com`

### Logs (Se houver problemas)
```bash
docker compose logs -f chatwoot-rails
docker compose logs -f evolution_api
docker compose logs -f postgres_chatwoot
```
- [ ] Logs do Chatwoot sem erros críticos
- [ ] Logs do Evolution sem erros críticos
- [ ] Logs do PostgreSQL sem erros críticos

### Configuração Inicial dos Serviços

#### Chatwoot
- [ ] Acesso à interface web funcionando
- [ ] Conta administrativa criada
- [ ] Senha padrão alterada
- [ ] SMTP testado (envio de email)

#### Evolution API
- [ ] API respondendo
- [ ] Documentação acessível em `/manager`
- [ ] Primeira instância WhatsApp criada (teste)

#### Portainer
- [ ] Interface acessível
- [ ] Usuário admin criado
- [ ] Containers visíveis no dashboard

---

## 🔒 VERIFICAÇÃO FINAL DE SEGURANÇA

### 🔍 Verificação de Credenciais
- [ ] **PostgreSQL**: Senha alterada em todos os arquivos
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
- [ ] **Arquivo .env**: Permissões restritas (`chmod 600 .env`)

---

## 🔍 MONITORAMENTO E TROUBLESHOOTING

### Comandos Úteis
```bash
# Status dos serviços
docker compose ps

# Logs em tempo real
docker compose logs -f [nome_do_serviço]

# Reiniciar serviço específico
docker compose restart [nome_do_serviço]

# Verificar uso de recursos
docker stats

# Verificar redes
docker network ls

# Verificar volumes
docker volume ls
```

### Recursos do Sistema
```bash
docker stats
htop
df -h
```
- [ ] CPU < 80%
- [ ] RAM < 80%
- [ ] Disco < 80%

### Portas de Acesso Local
- **Chatwoot**: http://SEU_IP:3000
- **Evolution API**: http://SEU_IP:8080
- **Portainer**: http://SEU_IP:9002
- **n8n**: http://SEU_IP:5678

---

## 🔄 BACKUP E ATUALIZAÇÕES

### Backup Antes de Atualizações
```bash
# Backup de volumes
docker run --rm -v ravenna_chatwoot_data:/data -v $(pwd):/backup alpine tar czf /backup/chatwoot_backup.tar.gz /data

# Backup de configurações
tar czf config_backup.tar.gz *.env */*.env
```

### Atualizar Imagens Docker
```bash
# Parar serviços
docker compose down

# Atualizar imagens
docker compose pull

# Reiniciar serviços
docker compose up -d
```

---

## 🚨 ARMADILHAS COMUNS

- ❌ **Não use as credenciais padrão em produção**
- ❌ **Não exponha as portas diretamente na internet**
- ❌ **Não commite credenciais no Git**
- ❌ **Não use HTTP em produção** (sempre HTTPS)
- ❌ **Não desabilite logs de segurança**
- ⚠️ **Webhook do Chatwoot** é configurado na UI (Inboxes → API) e NÃO via API
- ⚠️ **JSON com crases** (`` ` ``) quebra o parser; use apenas aspas duplas válidas
- ⚠️ **Em Docker**, use hostnames internos para comunicação entre containers

---

## ✅ DEPLOY CONCLUÍDO

Quando todos os itens estiverem marcados:

**🎉 PARABÉNS! O Projeto Ravenna está funcionando no Ubuntu 24.04 + aaPanel!**

### URLs de Acesso:
- **Chatwoot**: https://chatwoot.seudominio.com (ou http://SEU_IP:3000)
- **Evolution API**: https://evolution.seudominio.com (ou http://SEU_IP:8080)
- **Portainer**: https://portainer.seudominio.com (ou http://SEU_IP:9002)
- **n8n**: https://n8n.seudominio.com (ou http://SEU_IP:5678)

### Próximos Passos:
1. Configurar integrações entre Chatwoot e Evolution
2. Configurar automações no n8n
3. Configurar backup automático
4. Monitorar performance e logs

---

**📞 Suporte**: Em caso de problemas, verifique logs dos containers e configurações de rede.