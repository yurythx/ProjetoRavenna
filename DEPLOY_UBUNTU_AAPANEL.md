# 🚀 Deploy Ubuntu + aaPanel - Projeto Ravenna

Guia completo para deploy da stack Projeto Ravenna em servidor Ubuntu 24.04 LTS com aaPanel e túnel Cloudflare.

## 📋 Informações do Servidor

- **IP do Servidor**: `192.168.1.121`
- **Sistema**: Ubuntu 24.04 LTS
- **Painel**: aaPanel
- **Túnel**: Cloudflare
- **Deploy**: Via Git

## 🔧 Pré-requisitos no Servidor

### 1. Preparação do Sistema Ubuntu
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git nano htop
```

### 2. Instalação do aaPanel
```bash
# Instalar aaPanel
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh && sudo bash install.sh aapanel

# Após instalação, anote:
# - URL de acesso: http://192.168.1.121:7800
# - Usuário e senha gerados
```

### 3. Configuração do aaPanel
1. Acesse: `http://192.168.1.121:7800`
2. Faça login com credenciais geradas
3. Instale os seguintes softwares:
   - **Docker** (via App Store do aaPanel)
   - **Docker Compose** (via App Store do aaPanel)
   - **Nginx** (para reverse proxy)

### 4. Configuração do Docker
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
sudo usermod -aG docker www

# Reiniciar para aplicar mudanças
sudo reboot
```

## 📁 Deploy via Git

### 1. Clone do Repositório
```bash
# Navegar para diretório web do aaPanel
cd /www/wwwroot

# Clonar repositório
sudo git clone [URL_DO_SEU_REPOSITORIO] ProjetoRavenna
cd ProjetoRavenna

# Dar permissões adequadas
sudo chown -R www:www /www/wwwroot/ProjetoRavenna
sudo chmod -R 755 /www/wwwroot/ProjetoRavenna
```

### 2. Configuração de Ambiente
```bash
# Copiar arquivo de configuração para Ubuntu
cp .env.ubuntu .env

# Editar configurações específicas
nano .env
```

### 3. Configurações Específicas do IP

#### Arquivo `.env` Principal
```env
# IP do servidor
HOST_IP=192.168.1.121

# URLs dos serviços (temporárias - serão substituídas por domínios)
CHATWOOT_URL=http://192.168.1.121:3000
EVOLUTION_URL=http://192.168.1.121:8080
N8N_URL=http://192.168.1.121:5678
PORTAINER_URL=http://192.168.1.121:9002
```

## 🌐 Configuração do Túnel Cloudflare

### 1. Criar Túnel no Cloudflare
1. Acesse [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. Vá em **Access** → **Tunnels**
3. Clique em **Create a tunnel**
4. Escolha **Cloudflared**
5. Nomeie o túnel: `ravenna-production`
6. Copie o token gerado

### 2. Configurar Túnel Local
```bash
# Editar configuração do Cloudflare
nano cloudflare/.env
```

```env
# Token do túnel (substitua pelo seu token)
CLOUDFLARE_TUNNEL_TOKEN=seu_token_aqui_copiado_do_cloudflare

# Comando com o token
CLOUDFLARE_COMMAND=tunnel --no-autoupdate run --token seu_token_aqui_copiado_do_cloudflare

# IP do servidor
HOST_IP=192.168.0.121
```

### 3. Configurar Roteamento no Cloudflare
No painel do Cloudflare, configure os seguintes roteamentos:

| Subdomínio | Serviço | URL Local |
|------------|---------|-----------|
| `chatwoot.seudominio.com` | HTTP | `192.168.1.121:3000` |
| `evolution.seudominio.com` | HTTP | `192.168.1.121:8080` |
| `n8n.seudominio.com` | HTTP | `192.168.1.121:5678` |
| `portainer.seudominio.com` | HTTP | `192.168.1.121:9002` |

## 🔒 Configuração de Segurança

### 1. Firewall do Servidor
```bash
# Configurar UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 7800/tcp  # aaPanel
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Portas internas (apenas para rede local)
sudo ufw allow from 192.168.1.0/24 to any port 3000  # Chatwoot
sudo ufw allow from 192.168.1.0/24 to any port 8080  # Evolution
sudo ufw allow from 192.168.1.0/24 to any port 5678  # N8N
sudo ufw allow from 192.168.1.0/24 to any port 9002  # Portainer
```

### 2. Configuração do aaPanel
1. **Security** → **Firewall**:
   - Liberar portas: 80, 443, 7800
   - Bloquear acesso direto às portas dos serviços (3000, 8080, 5678, 9002)

2. **Security** → **SSH Security**:
   - Alterar porta SSH padrão
   - Configurar chaves SSH

### 3. Alterar Senhas Padrão
```bash
# Gerar novas senhas seguras
openssl rand -base64 32  # Para PostgreSQL
openssl rand -base64 32  # Para Redis
openssl rand -hex 64     # Para Chatwoot SECRET_KEY_BASE
```

Edite os arquivos `.env` em cada pasta de serviço com as novas senhas.

## 🚀 Inicialização da Stack

### 1. Criar Rede Docker
```bash
cd /www/wwwroot/ProjetoRavenna
docker network create app_network
```

### 2. Iniciar Serviços
```bash
# Iniciar todos os serviços
docker compose up -d

# Verificar status
docker compose ps

# Ver logs
docker compose logs -f
```

### 3. Verificação dos Serviços
```bash
# Testar conectividade local
curl http://192.168.1.121:3000  # Chatwoot
curl http://192.168.1.121:8080  # Evolution API
curl http://192.168.1.121:5678  # N8N
curl http://192.168.1.121:9002  # Portainer
```

## 🌍 Configuração de Domínios no aaPanel

### 1. Adicionar Sites
No aaPanel, vá em **Website** → **Add site**:

1. **chatwoot.seudominio.com**
   - Document Root: `/www/wwwroot/ProjetoRavenna`
   - PHP Version: Não aplicável

2. **evolution.seudominio.com**
   - Document Root: `/www/wwwroot/ProjetoRavenna`
   - PHP Version: Não aplicável

3. **n8n.seudominio.com**
   - Document Root: `/www/wwwroot/ProjetoRavenna`
   - PHP Version: Não aplicável

4. **portainer.seudominio.com**
   - Document Root: `/www/wwwroot/ProjetoRavenna`
   - PHP Version: Não aplicável

### 2. Configurar Reverse Proxy
Para cada site criado, configure o reverse proxy:

#### Chatwoot
```nginx
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
```

#### Evolution API
```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### N8N
```nginx
location / {
    proxy_pass http://127.0.0.1:5678;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

#### Portainer
```nginx
location / {
    proxy_pass http://127.0.0.1:9002;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 📊 Monitoramento e Manutenção

### 1. Scripts de Monitoramento
```bash
# Criar script de monitoramento
nano /www/wwwroot/ProjetoRavenna/monitor.sh
```

```bash
#!/bin/bash
echo "=== Status dos Containers ==="
docker compose ps

echo "=== Uso de Recursos ==="
docker stats --no-stream

echo "=== Espaço em Disco ==="
df -h

echo "=== Logs de Erro Recentes ==="
docker compose logs --tail=10 | grep -i error
```

```bash
# Tornar executável
chmod +x /www/wwwroot/ProjetoRavenna/monitor.sh

# Executar
./monitor.sh
```

### 2. Backup Automatizado
```bash
# Configurar cron para backup diário
crontab -e

# Adicionar linha para backup às 2h da manhã
0 2 * * * cd /www/wwwroot/ProjetoRavenna && docker compose exec postgres_chatwoot pg_dumpall -U postgres > /backup/ravenna_$(date +\%Y\%m\%d).sql
```

### 3. Atualizações
```bash
# Script de atualização
nano /www/wwwroot/ProjetoRavenna/update.sh
```

```bash
#!/bin/bash
echo "Atualizando Projeto Ravenna..."

# Fazer backup antes da atualização
./monitor.sh > /backup/status_pre_update_$(date +%Y%m%d_%H%M).log

# Atualizar código
git pull origin main

# Atualizar imagens Docker
docker compose pull

# Reiniciar serviços
docker compose up -d

echo "Atualização concluída!"
```

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Containers não iniciam
```bash
# Ver logs detalhados
docker compose logs [nome_do_servico]

# Verificar recursos
free -h
df -h

# Verificar rede
docker network ls
```

#### 2. Túnel Cloudflare não conecta
```bash
# Verificar token
docker compose logs cloudflared

# Testar conectividade
ping 1.1.1.1

# Verificar configuração
cat cloudflare/.env
```

#### 3. Reverse proxy não funciona
- Verificar configuração do Nginx no aaPanel
- Testar acesso direto às portas locais
- Verificar logs do Nginx

### Comandos Úteis
```bash
# Reiniciar stack completa
docker compose down && docker compose up -d

# Ver logs em tempo real
docker compose logs -f

# Limpar recursos não utilizados
docker system prune -a

# Backup manual
docker compose exec postgres_chatwoot pg_dumpall -U postgres > backup_manual_$(date +%Y%m%d).sql
```

## ✅ Checklist de Deploy

- [ ] Ubuntu 24.04 LTS instalado e atualizado
- [ ] aaPanel instalado e configurado
- [ ] Docker e Docker Compose instalados
- [ ] Repositório clonado em `/www/wwwroot/ProjetoRavenna`
- [ ] Arquivo `.env` configurado com IP 192.168.1.121
- [ ] Túnel Cloudflare criado e configurado
- [ ] Rede Docker `app_network` criada
- [ ] Senhas padrão alteradas
- [ ] Firewall configurado
- [ ] Sites criados no aaPanel
- [ ] Reverse proxy configurado
- [ ] Serviços iniciados com `docker compose up -d`
- [ ] Domínios apontando para o túnel Cloudflare
- [ ] SSL configurado via Cloudflare
- [ ] Backup automatizado configurado
- [ ] Monitoramento funcionando

---

**🎯 Resultado Final**: Stack Projeto Ravenna rodando em produção no servidor Ubuntu 192.168.1.121 com aaPanel, acessível via domínios seguros através do túnel Cloudflare.
curl http://192.168.0.121:3000
curl http://192.168.0.121:8080
curl http://192.168.0.121:5678
curl http://192.168.0.121:9000