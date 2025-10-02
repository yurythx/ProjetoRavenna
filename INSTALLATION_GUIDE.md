# 🛠️ Guia de Instalação - Projeto Ravenna

## 📋 Pré-requisitos

### Sistema Operacional
- **Ubuntu Server 20.04 LTS** ou superior
- **Ubuntu Server 22.04 LTS** (recomendado)
- Mínimo 4GB RAM, 20GB de espaço em disco
- Usuário com privilégios sudo

### Dependências
- Docker Engine 24.0+
- Docker Compose v2.0+
- Git
- Curl/Wget

## 🚀 Instalação Rápida (Windows)

### Pré-requisitos
- Docker Desktop para Windows instalado e funcionando
- PowerShell 5.0+ ou PowerShell Core
- Git para Windows
- Pelo menos 4GB de RAM disponível

### Passos de Instalação

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

# Iniciar todos os serviços (Compose v2)
docker compose up -d

# Verificar status
.\monitor-services.ps1
```

### Verificação da Instalação
```powershell
# Verificar se todos os containers estão rodando
docker ps

# Executar script de monitoramento
.\monitor-services.ps1

# Verificar URLs de acesso (servidor 192.168.0.121)
# Chatwoot: http://192.168.0.121:3000
# Evolution API: http://192.168.0.121:8080
# N8N: http://192.168.0.121:5678
# MinIO: http://192.168.0.121:9001
# Portainer: http://192.168.0.121:9002
```

## 🚀 Instalação Automática (Linux)

### 1. Preparação do Ambiente
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y docker.io docker-compose-plugin git curl

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone e Configuração
```bash
# Clone do repositório
git clone [url-do-repositorio]
cd ProjetoRavenna

# Configurar permissões (se necessário)
chmod +x *.sh
```

### 3. Inicialização dos Serviços
```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar status
docker ps
```

Este script irá:
- ✅ Atualizar o sistema
- ✅ Instalar Docker e Docker Compose
- ✅ Configurar firewall (UFW)
- ✅ Otimizar parâmetros do sistema
- ✅ Criar rede Docker
- ✅ Configurar logs rotativos

### 3. Configuração das Variáveis de Ambiente

#### PostgreSQL
```bash
nano postgres/.env
```

**Configurações essenciais:**
```env
POSTGRES_PASSWORD=SuaSenhaSegura123!
POSTGRES_PORT=5432
POSTGRES_CONTAINER=postgres_chatwoot
```

#### Redis
```bash
nano redis/.env
```

**Configurações essenciais:**
```env
REDIS_PASSWORD=SuaSenhaRedis123!
REDIS_PORT=6379
```

#### MinIO
```bash
nano minio/.env
```

**Configurações essenciais:**
```env
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=MinioAdmin123!
SERVER_IP=192.168.1.100  # Seu IP do servidor
```

#### Chatwoot
```bash
nano chatwoot/.env
```

**Configurações essenciais:**
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

# MinIO
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=MinioAdmin123!
```

#### N8N
```bash
nano n8n/.env
```

**Configurações essenciais:**
```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=N8nAdmin123!

# Banco de dados
DB_POSTGRESDB_PASSWORD=SuaSenhaSegura123!
```

#### Evolution API
```bash
nano evolution/.env
```

**Configurações essenciais:**
```env
SERVER_URL=http://192.168.1.100:8080
DATABASE_CONNECTION_URI=postgresql://postgres:SuaSenhaSegura123!@postgres:5432/evolution
AUTHENTICATION_API_KEY=SuaChaveEvolution123!
S3_SECRET_KEY=MinioAdmin123!
```

#### Cloudflare Tunnel (Opcional)
```bash
nano cloudflare/.env
```

**Configurações essenciais:**
```env
CLOUDFLARE_TOKEN=seu_token_cloudflare_aqui
```

### 4. Inicialização dos Serviços

```bash
# Iniciar todos os serviços
./scripts/start-services.sh start

# Verificar status
./scripts/start-services.sh status

# Ver URLs de acesso
./scripts/start-services.sh urls
```

## 🔧 Instalação Manual (Passo a Passo)

### 1. Instalar Docker

```bash
# Remover versões antigas
sudo apt-get remove docker docker-engine docker.io containerd runc

# Atualizar sistema
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Adicionar chave GPG do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar repositório
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Reiniciar sessão ou executar
newgrp docker
```

### 2. Configurar Firewall

```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow ssh

# Permitir portas dos serviços
sudo ufw allow 5432/tcp  # PostgreSQL
sudo ufw allow 6379/tcp  # Redis
sudo ufw allow 9000/tcp  # MinIO API
sudo ufw allow 9001/tcp  # MinIO Console
sudo ufw allow 3000/tcp  # Chatwoot
sudo ufw allow 5678/tcp  # N8N
sudo ufw allow 8080/tcp  # Evolution API

# Verificar status
sudo ufw status
```

### 3. Otimizar Sistema

```bash
# Aumentar limites de arquivos
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "root soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "root hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Configurar parâmetros do kernel
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
echo "fs.file-max=2097152" | sudo tee -a /etc/sysctl.conf
echo "net.core.somaxconn=65535" | sudo tee -a /etc/sysctl.conf

# Aplicar configurações
sudo sysctl -p
```

### 4. Criar Rede Docker

```bash
# Criar rede personalizada
docker network create app_network
```

### 5. Iniciar Serviços Manualmente

```bash
# PostgreSQL
cd postgres/
docker compose up -d
cd ..

# Redis
cd redis/
docker compose up -d
cd ..

# MinIO
cd minio/
docker compose up -d
cd ..

# Aguardar inicialização dos serviços base
sleep 30

# Chatwoot
cd chatwoot/
docker compose up -d
cd ..

# N8N
cd n8n/
docker compose up -d
cd ..

# Evolution API
cd evolution/
docker compose up -d
cd ..

# Cloudflare (opcional)
cd cloudflare/
docker compose up -d
cd ..
```

## 🔍 Verificação da Instalação

### 1. Status dos Containers

```bash
# Ver todos os containers
docker ps

# Status específico por serviço
./scripts/monitor-services.sh status
```

### 2. Conectividade

```bash
# Testar portas
./scripts/monitor-services.sh connectivity

# Testar URLs
curl -I http://localhost:3000  # Chatwoot
curl -I http://localhost:5678  # N8N
curl -I http://localhost:8080  # Evolution API
curl -I http://localhost:9001  # MinIO Console
```

### 3. Logs dos Serviços

```bash
# Ver logs de todos os serviços
./scripts/monitor-services.sh logs

# Logs específicos
docker logs chatwoot-rails
docker logs n8n_editor
docker logs evolution_api
```

## 🌐 Configuração Inicial dos Serviços

### 1. Chatwoot

1. Acesse: `http://seu-ip:3000`
2. Crie conta de administrador
3. Configure integração com WhatsApp via Evolution API

### 2. N8N

1. Acesse: `http://seu-ip:5678`
2. Use credenciais do `.env`:
   - Usuário: `admin`
   - Senha: `N8nAdmin123!`
3. Configure conexões com banco de dados

### 3. Evolution API

1. Acesse: `http://seu-ip:8080`
2. Use a API Key configurada no `.env`
3. Crie instâncias do WhatsApp

### 4. MinIO

1. Acesse: `http://seu-ip:9001`
2. Use credenciais:
   - Usuário: `minioadmin`
   - Senha: `MinioAdmin123!`
3. Crie buckets necessários

## 🚨 Solução de Problemas

### Container não inicia

```bash
# Ver logs detalhados
docker logs nome_do_container

# Verificar recursos
df -h
free -h

# Reiniciar container
docker restart nome_do_container
```

### Erro de permissão

```bash
# Verificar propriedade dos arquivos
ls -la

# Corrigir permissões
sudo chown -R $USER:$USER .
```

### Porta em uso

```bash
# Verificar processo usando a porta
sudo netstat -tulpn | grep :porta

# Parar processo ou alterar porta no .env
```

### Falta de memória

```bash
# Verificar uso de memória
free -h
docker stats

# Limpar containers não utilizados
docker system prune -a
```

## 📊 Monitoramento Pós-Instalação

### Scripts de Monitoramento

```bash
# Status geral
./scripts/monitor-services.sh status

# Recursos do sistema
./scripts/monitor-services.sh resources

# Conectividade entre serviços
./scripts/monitor-services.sh connectivity

# Monitoramento contínuo
./scripts/monitor-services.sh monitor
```

### Configurar Backups

```bash
# Backup manual
./scripts/backup-data.sh backup

# Configurar backup automático (crontab)
crontab -e

# Adicionar linha para backup diário às 2h
0 2 * * * /opt/ProjetoRavenna/scripts/backup-data.sh backup
```

## 🔐 Segurança Pós-Instalação

### 1. Alterar Senhas Padrão

- ✅ PostgreSQL: `POSTGRES_PASSWORD`
- ✅ Redis: `REDIS_PASSWORD`
- ✅ MinIO: `MINIO_ROOT_PASSWORD`
- ✅ N8N: `N8N_BASIC_AUTH_PASSWORD`
- ✅ Evolution API: `AUTHENTICATION_API_KEY`

### 2. Configurar HTTPS

```bash
# Instalar Certbot
sudo apt install certbot

# Obter certificado SSL
sudo certbot certonly --standalone -d seu-dominio.com

# Configurar proxy reverso (Nginx/Apache)
```

### 3. Configurar Cloudflare Tunnel

```bash
# Obter token no dashboard Cloudflare
# Configurar no arquivo cloudflare/.env
# Iniciar tunnel
cd cloudflare/
docker compose up -d
```

## 📈 Otimização de Performance

### 1. Configurações do PostgreSQL

```bash
# Editar configurações personalizadas
nano postgres/postgresql.conf

# Aplicar configurações
docker restart postgres_chatwoot
```

### 2. Configurações do Redis

```bash
# Configurar persistência otimizada
nano redis/redis.conf

# Reiniciar Redis
docker restart redis_chatwoot
```

### 3. Monitoramento de Performance

```bash
# Relatório de performance
./scripts/monitor-services.sh report

# Monitoramento em tempo real
./scripts/monitor-services.sh monitor
```

## ✅ Checklist de Instalação

- [ ] Sistema Ubuntu atualizado
- [ ] Docker e Docker Compose instalados
- [ ] Firewall configurado
- [ ] Rede Docker criada
- [ ] Arquivos `.env` configurados
- [ ] Serviços iniciados com sucesso
- [ ] URLs acessíveis
- [ ] Senhas padrão alteradas
- [ ] Backup configurado
- [ ] Monitoramento ativo

## 📞 Suporte

Em caso de problemas:

1. Consulte os logs: `./scripts/monitor-services.sh logs`
2. Verifique o status: `./scripts/monitor-services.sh status`
3. Execute diagnóstico: `./scripts/monitor-services.sh full`
4. Consulte a documentação específica de cada serviço

---

**Projeto Ravenna** - Guia de Instalação
Versão: 1.0 | Atualizado: $(date +%Y-%m-%d)
 
## 🧰 Configuração no aaPanel (Ubuntu)

O aaPanel facilita a gestão de serviços web no servidor Ubuntu. Abaixo, um guia rápido para integrar nossos serviços:

### 1) Acesso e preparação
- Acesse o painel: `http://192.168.0.121:8888` (porta padrão do aaPanel)
- Atualize o sistema em "App Store" → "Atualizações".
- Instale `Nginx` (ou `OpenLiteSpeed/Apache`) via App Store.

### 2) Instalar Docker pelo aaPanel (opcional)
- App Store → Docker → Instalar.
- Caso prefira via terminal, já cobrimos acima com `docker.io` e `docker-compose-plugin`.

### 3) Abrir portas necessárias no firewall
No aaPanel (Segurança/Firewall) ou via terminal:
```bash
sudo ufw allow 3000/tcp  # Chatwoot
sudo ufw allow 5678/tcp  # N8N
sudo ufw allow 8080/tcp  # Evolution API
sudo ufw allow 9001/tcp  # MinIO Console
sudo ufw allow 9002/tcp  # Portainer
sudo ufw reload
```

### 4) Configurar Reverse Proxy (Nginx)
Crie sites no aaPanel e configure proxy reverso para cada serviço (substitua pelo seu domínio interno/externo):

- `chatwoot.seu-dominio` → `http://192.168.0.121:3000`
- `n8n.seu-dominio` → `http://192.168.0.121:5678`
- `api.seu-dominio` (Evolution) → `http://192.168.0.121:8080`
- `minio.seu-dominio` → `http://192.168.0.121:9001`
- `portainer.seu-dominio` → `http://192.168.0.121:9002`

Em Nginx, use a diretiva padrão de proxy:
```nginx
location / {
  proxy_pass http://192.168.0.121:PORTA_ALVO;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 5) Certificados SSL (Let's Encrypt)
- Em cada site, vá em "SSL" → "Let's Encrypt" → informe o domínio.
- Habilite redirecionamento HTTPS.

### 6) Cloudflare Tunnel (opcional)
- Caso queira expor externamente sem abrir portas, configure o serviço `cloudflared`.
- Defina o token no arquivo `cloudflare/.env` e atualize `cloudflare.yml` conforme necessidade.

### 7) Testes pós-configuração
- Acesse os domínios e confirme que cada serviço carrega via HTTPS.
- Verifique `Portainer` em `http://192.168.0.121:9002` para gerenciar containers.