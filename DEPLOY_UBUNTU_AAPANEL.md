# 🚀 DEPLOY UBUNTU 24.04 + aaPanel - PROJETO RAVENNA

## 📋 Pré-requisitos

### Sistema Operacional
- **Ubuntu 24.04 LTS** (recomendado)
- **IP do servidor**: `192.168.0.121`
- **aaPanel** instalado e configurado

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

## 🔧 Configurações Específicas para Ubuntu

### 1. Ajustes de Firewall
```bash
# Permitir portas necessárias
sudo ufw allow 3000/tcp    # Chatwoot
sudo ufw allow 8080/tcp    # Evolution API
sudo ufw allow 9000/tcp    # MinIO API
sudo ufw allow 9001/tcp    # MinIO Console
sudo ufw allow 9002/tcp    # Portainer
sudo ufw allow 5678/tcp    # n8n
sudo ufw enable
```

### 2. Configuração de Volumes Docker
```bash
# Criar diretórios para volumes (opcional, Docker cria automaticamente)
sudo mkdir -p /var/lib/docker/volumes/ravenna_data
sudo chown -R 1000:1000 /var/lib/docker/volumes/ravenna_data
```

### 3. Configuração de Rede Docker
```bash
# Criar rede antes de iniciar os serviços
docker network create app_network
```

## 🌐 Integração com aaPanel

### 1. Configuração de Reverse Proxy no aaPanel

#### Para Chatwoot (porta 3000)
```nginx
# No aaPanel > Website > Reverse Proxy
# Target URL: http://127.0.0.1:3000
# Configuração adicional no nginx:

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

#### Para MinIO Console (porta 9001)
```nginx
# Target URL: http://127.0.0.1:9001
location / {
    proxy_pass http://127.0.0.1:9001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 2. Configuração SSL no aaPanel
- Acesse **aaPanel > Website > SSL**
- Configure certificados SSL para cada domínio
- Ative **Force HTTPS** após configurar SSL

### 3. Configuração de Domínios
No aaPanel, configure os seguintes subdomínios:
- `chatwoot.seudominio.com` → `127.0.0.1:3000`
- `evolution.seudominio.com` → `127.0.0.1:8080`
- `minio.seudominio.com` → `127.0.0.1:9001`
- `portainer.seudominio.com` → `127.0.0.1:9002`
- `n8n.seudominio.com` → `127.0.0.1:5678`

## 📝 Ajustes nos Arquivos de Configuração

### 1. Atualizar .env Principal
```bash
# Editar arquivo .env
nano .env

# Alterar as seguintes variáveis:
HOST_IP=192.168.0.121
FRONTEND_URL=https://chatwoot.seudominio.com  # Se usar SSL
SERVER_URL=https://evolution.seudominio.com   # Se usar SSL
MINIO_BROWSER_REDIRECT_URL=https://minio.seudominio.com
MINIO_SERVER_URL=https://minio.seudominio.com
```

### 2. Configurar SMTP (Recomendado)
```bash
# No arquivo .env, configure SMTP real:
SMTP_DOMAIN=gmail.com
SMTP_ADDRESS=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=seuemail@gmail.com
SMTP_PASSWORD=sua_senha_de_app
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
```

## 🚀 Processo de Deploy

### 1. Preparação
```bash
# Clonar/copiar projeto para o servidor
cd /opt
sudo git clone seu_repositorio projeto-ravenna
cd projeto-ravenna
sudo chown -R $USER:$USER .
```

### 2. Configuração
```bash
# Copiar e editar arquivos .env
cp .env.example .env
nano .env  # Ajustar configurações

# Criar rede Docker
docker network create app_network
```

### 3. Inicialização
```bash
# Iniciar infraestrutura base primeiro
docker compose up -d postgres_chatwoot postgres_n8n postgres_evolution redis_chatwoot redis_n8n redis_evolution minio

# Aguardar 60 segundos para inicialização
sleep 60

# Iniciar serviços principais
docker compose up -d chatwoot-rails chatwoot-sidekiq n8n evolution_api

# Iniciar serviços auxiliares
docker compose up -d portainer cloudflared
```

### 4. Verificação
```bash
# Verificar status dos containers
docker compose ps

# Verificar logs se necessário
docker compose logs -f chatwoot-rails
docker compose logs -f evolution_api
```

## 🔍 Monitoramento e Troubleshooting

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

### Portas de Acesso Local
- **Chatwoot**: http://192.168.0.121:3000
- **Evolution API**: http://192.168.0.121:8080
- **MinIO Console**: http://192.168.0.121:9001
- **Portainer**: http://192.168.0.121:9002
- **n8n**: http://192.168.0.121:5678

### Logs Importantes
```bash
# Chatwoot
docker compose logs chatwoot-rails | tail -100

# Evolution API
docker compose logs evolution_api | tail -100

# PostgreSQL
docker compose logs postgres_chatwoot | tail -100
```

## ⚠️ Considerações de Segurança

### 1. Firewall
- Mantenha apenas as portas necessárias abertas
- Use aaPanel para gerenciar regras de firewall

### 2. Senhas
- Altere todas as senhas padrão nos arquivos .env
- Use senhas fortes (mínimo 16 caracteres)

### 3. SSL/TLS
- Configure SSL para todos os domínios
- Force redirecionamento HTTPS no aaPanel

### 4. Backup
- Configure backup automático dos volumes Docker
- Faça backup regular dos arquivos .env

## 🔄 Atualizações

### Atualizar Imagens Docker
```bash
# Parar serviços
docker compose down

# Atualizar imagens
docker compose pull

# Reiniciar serviços
docker compose up -d
```

### Backup Antes de Atualizações
```bash
# Backup de volumes
docker run --rm -v ravenna_chatwoot_data:/data -v $(pwd):/backup alpine tar czf /backup/chatwoot_backup.tar.gz /data

# Backup de configurações
tar czf config_backup.tar.gz *.env */*.env
```

## 📞 Suporte

Em caso de problemas:
1. Verifique logs dos containers
2. Confirme configurações de rede
3. Valide configurações do aaPanel
4. Teste conectividade entre serviços

---

**✅ Após seguir este guia, todos os serviços do Projeto Ravenna estarão funcionando corretamente no Ubuntu 24.04 com aaPanel!**