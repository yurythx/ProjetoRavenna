# 🚀 Guia Completo de Deploy - ProjetoRavenna

## 📖 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Preparação do Servidor](#preparação-do-servidor)
4. [Instalação de Dependências](#instalação-de-dependências)
5. [Configuração do Projeto](#configuração-do-projeto)
6. [Configuração do Cloudflare Tunnel](#configuração-do-cloudflare-tunnel)
7. [Deploy da Aplicação](#deploy-da-aplicação)
8. [Pós-Deploy](#pós-deploy)
9. [Verificação e Testes](#verificação-e-testes)
10. [Troubleshooting](#troubleshooting)
11. [Manutenção](#manutenção)

---

## 📍 Visão Geral

Este guia detalha **TODOS os passos** necessários para fazer o deploy do ProjetoRavenna em um servidor Ubuntu com aaPanel, usando Docker, Docker Compose e Cloudflare Tunnel.

**Arquitetura do Deploy:**
```
Internet (Cloudflare)
        ↓
Cloudflare Tunnel (Container)
        ↓
  Docker Network (projetoravenna_network)
        ↓
    ┌───────┴───────┐
    ↓               ↓
Frontend        Backend
(Next.js)       (Django)
(Port 3001)     (Port 8000)
    ↓               ↓
    └───────┬───────┘
            ↓
    ┌───────┴───────┐
    ↓               ↓
PostgreSQL      MinIO
(Port 5432)     (9000/9001)
```

**Tempo estimado:** 30-60 minutos (primeira vez)

---

## 🔧 Pré-requisitos

### Servidor

- ✅ Servidor Ubuntu 20.04 ou superior
- ✅ Mínimo 2 GB RAM (recomendado 4 GB)
- ✅ Mínimo 20 GB de espaço em disco
- ✅ Acesso root ou sudo
- ✅ Conexão SSH configurada

### Domínios

- ✅ Domínio principal: `projetoravenna.cloud`
- ✅ Subdomínio API: `api.projetoravenna.cloud`
- ✅ (Opcional) Subdomínio MinIO: `minio.projetoravenna.cloud`

### Cloudflare

- ✅ Conta Cloudflare com domínio adicionado
- ✅ Cloudflare Tunnel criado e configurado
- ✅ Token do Tunnel disponível

### Local (Sua Máquina)

- ✅ Git instalado
- ✅ Cliente SSH (PuTTY, MobaXterm, ou terminal)
- ✅ (Opcional) Cliente SFTP (FileZilla, WinSCP)

---

## 🖥️ Preparação do Servidor

### Passo 1: Conectar ao Servidor via SSH

```bash
# Substitua pelos seus dados
ssh root@SEU_IP_DO_SERVIDOR

# Ou se usar usuário não-root:
ssh usuario@SEU_IP_DO_SERVIDOR
```

**Validação:**
```bash
# Deve mostrar informações do sistema
uname -a
```

### Passo 2: Atualizar Sistema Operacional

```bash
# Atualizar lista de pacotes
sudo apt update

# Atualizar pacotes instalados
sudo apt upgrade -y

# Limpar pacotes não utilizados
sudo apt autoremove -y
```

**Tempo estimado:** 5-10 minutos

**Validação:**
```bash
# Verificar versão do Ubuntu
lsb_release -a
# Deve mostrar: Ubuntu 20.04 ou superior
```

### Passo 3: Instalar Ferramentas Básicas

```bash
# Instalar ferramentas úteis
sudo apt install -y \
    curl \
    wget \
    git \
    nano \
    vim \
    htop \
    net-tools \
    ca-certificates \
    gnupg \
    lsb-release
```

**Validação:**
```bash
# Verificar instalação
git --version
curl --version
```

---

## 🐋 Instalação de Dependências

### Passo 4: Instalar Docker

#### 4.1. Remover versões antigas (se existirem)

```bash
sudo apt remove -y docker docker-engine docker.io containerd runc || true
```

#### 4.2. Configurar repositório do Docker

```bash
# Adicionar chave GPG oficial do Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker-archive-keyring.gpg

# Adicionar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

#### 4.3. Instalar Docker Engine

```bash
# Atualizar apt novamente
sudo apt update

# Instalar Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**Tempo estimado:** 3-5 minutos

#### 4.4. Configurar permissões do Docker

```bash
# Adicionar usuário atual ao grupo docker
sudo usermod -aG docker $USER

# Ativar o grupo sem necessidade de logout
newgrp docker

# Habilitar Docker para iniciar no boot
sudo systemctl enable docker
sudo systemctl start docker
```

**Validação:**
```bash
# Verificar versão do Docker
docker --version
# Deve mostrar: Docker version 24.x.x ou superior

# Testar Docker sem sudo
docker run hello-world
# Deve baixar e executar container de teste com sucesso
```

### Passo 5: Instalar Docker Compose

```bash
# Baixar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose

# Dar permissão de execução
sudo chmod +x /usr/local/bin/docker-compose

# Criar link simbólico (opcional, para compatibilidade)
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
```

**Validação:**
```bash
# Verificar versão
docker-compose --version
# Deve mostrar: Docker Compose version v2.x.x ou superior
```

### Passo 6: Configurar Firewall

```bash
# Habilitar firewall
sudo ufw enable

# Permitir SSH (IMPORTANTE fazer isso PRIMEIRO!)
sudo ufw allow 22/tcp
sudo ufw allow OpenSSH

# Permitir HTTP e HTTPS (para aaPanel)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Permitir porta do aaPanel
sudo ufw allow 8888/tcp

# Verificar regras
sudo ufw status verbose
```

**Validação:**
```bash
sudo ufw status
# Deve mostrar: Status: active
# E listar as portas permitidas
```

> [!WARNING]
> **NÃO exponha as portas 8000, 3001, 9000, 9001 no firewall!**
> O Cloudflare Tunnel acessa internamente via rede Docker.

---

## 📂 Configuração do Projeto

### Passo 7: Criar Estrutura de Diretórios

```bash
# Criar diretório do projeto (recomendado dentro de /www/wwwroot)
sudo mkdir -p /www/wwwroot
cd /www/wwwroot

# Se não tiver permissão, ajustar ownership
sudo chown -R $USER:$USER /www/wwwroot
```

### Passo 8: Clonar Repositório

#### Opção A: Via Git (Recomendado)

```bash
cd /www/wwwroot

# Clonar repositório
git clone https://github.com/SEU_USUARIO/ProjetoRavenna.git projetoravenna

# Ou se usar SSH:
# git clone git@github.com:SEU_USUARIO/ProjetoRavenna.git projetoravenna

cd projetoravenna
```

**Validação:**
```bash
# Verificar estrutura
ls -la

# Deve mostrar:
# - backend/
# - frontend/
# - docker-compose.yml
# - .env.example
# - deploy.sh
# etc.
```

#### Opção B: Via Upload Manual

Se preferir fazer upload via SFTP:

1. Conecte-se ao servidor via SFTP (FileZilla/WinSCP)
2. Navegue até `/www/wwwroot/projetoravenna`
3. Faça upload de todos os arquivos do projeto
4. Verifique que a estrutura está completa

### Passo 9: Configurar Variáveis de Ambiente

#### 9.1. Copiar arquivo de exemplo

```bash
cd /www/wwwroot/projetoravenna
cp .env.example .env
```

#### 9.2. Gerar SECRET_KEY do Django

```bash
# Gerar chave segura
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

**Copie a chave gerada!** Exemplo:
```
django-insecure-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

#### 9.3. Editar arquivo .env

```bash
nano .env
```

**Configure as seguintes variáveis:**

```env
# ============================================
# Django Backend Configuration
# ============================================

# Cole aqui a SECRET_KEY gerada no passo anterior
DJANGO_SECRET_KEY=django-insecure-COLE_SUA_CHAVE_AQUI

# IMPORTANTE: Manter False em produção
DEBUG=False

# ============================================
# Database Configuration
# ============================================

# Crie uma senha FORTE e ÚNICA para o PostgreSQL
DB_PASSWORD=SuaSenhaPostgresForte123!@#

# ============================================
# MinIO Object Storage Configuration
# ============================================

MINIO_ROOT_USER=minioadmin
# Crie uma senha FORTE e ÚNICA para o MinIO
MINIO_ROOT_PASSWORD=SuaSenhaMinioForte456!@#
MINIO_BUCKET_NAME=projetoravenna

# ============================================
# Gunicorn Configuration
# ============================================

# Configurar baseado no seu servidor:
# Fórmula: (2 x Número de CPUs) + 1
# Para 2 CPUs: 5
# Para 4 CPUs: 9
GUNICORN_WORKERS=5
GUNICORN_TIMEOUT=120
```

**Salvar e sair:**
- Pressione `Ctrl + O` → Enter (salvar)
- Pressione `Ctrl + X` (sair)

**Validação:**
```bash
# Verificar se .env foi criado
cat .env | grep DJANGO_SECRET_KEY
# Deve mostrar a chave configurada (não o exemplo)

cat .env | grep DB_PASSWORD
# Deve mostrar sua senha (não o exemplo)
```

> [!CAUTION]
> **Nunca compartilhe o arquivo .env ou faça commit dele no Git!**

### Passo 10: Configurar Permissões

```bash
cd /www/wwwroot/projetoravenna

# Tornar scripts executáveis
chmod +x deploy.sh
chmod +x backend/entrypoint.sh

# Ajustar ownership (se necessário)
sudo chown -R $USER:$USER /www/wwwroot/projetoravenna
```

**Validação:**
```bash
# Verificar permissões
ls -la | grep deploy.sh
# Deve mostrar: -rwxr-xr-x (x indica executável)
```

---

## ☁️ Configuração do Cloudflare Tunnel

### Passo 11: Conectar Cloudflare Tunnel Existente

Como você já possui um container do Cloudflare (`cloudflared`) rodando no servidor, precisamos conectá-lo à rede do ProjetoRavenna para que ele consiga encaminhar o tráfego.

#### 11.1. Identificar o container existente

```bash
# Listar containers para achar o nome correto
docker ps | grep cloudflare
```

Vamos assumir que o nome seja `cloudflared` (ou o nome que aparecer na lista).

#### 11.2. Criar a rede do projeto (se ainda não existir)

O script `deploy.sh` cria a rede automaticamente, mas para configurar o Cloudflare antes, podemos criá-la manualmente:

```bash
docker network create projetoravenna_network || true
```

#### 11.3. Conectar Cloudflare à rede do projeto

Este comando permite que o container do Cloudflare "enxergue" nossos containers `frontend` e `backend`.

```bash
# Sintaxe: docker network connect [REDE] [CONTAINER_CLOUDFLARE]
docker network connect projetoravenna_network cloudflared
```

> [!IMPORTANT]
> Se o container do Cloudflare for recriado (ex: update), você precisará rodar este comando novamente!

#### 11.4. Configurar Rotas no Dashboard Cloudflare

Acesse o Dashboard da Cloudflare (Zero Trust) e configure as rotas do tunnel **existente**:

**Rota 1 - Frontend:**
- Subdomain: `(vazio)` ou `www`
- Domain: `projetoravenna.cloud`
- Type: `HTTP`
- URL: `http://frontend:3001`

**Rota 2 - Backend API:**
- Subdomain: `api`
- Domain: `projetoravenna.cloud`
- Type: `HTTP`
- URL: `http://backend:8000`

> [!NOTE]
> Usamos `http://frontend:3001` porque agora o container Cloudflare está na mesma rede `projetoravenna_network`.


---

## 🚀 Deploy da Aplicação

### Passo 12: Primeiro Deploy

#### 12.1. Executar script de deploy

```bash
cd /www/wwwroot/projetoravenna

# Executar deploy
./deploy.sh
```

**O que o script vai fazer:**

1. ✅ Validar variáveis de ambiente
2. ✅ Criar backup do banco (se já existir)
3. ✅ Parar containers antigos
4. ✅ Verificar espaço em disco
5. ✅ Build das imagens Docker (frontend + backend)
6. ✅ Iniciar containers
7. ✅ Aguardar healthchecks
8. ✅ Executar migrations do Django
9. ✅ Coletar arquivos estáticos
10. ✅ Configurar bucket MinIO

**Tempo estimado:** 10-15 minutos (primeira vez)

**Saída esperada:**

```
🚀 ProjetoRavenna - Deploy Script
==================================
🔍 Validating environment variables...
✅ All required environment variables are set
📦 Creating database backup...
⚠️  Database not running, skipping backup
⏸️  Stopping containers...
💾 Checking disk space...
🔨 Building containers (isso pode levar alguns minutos)...
▶️  Starting containers...
⏳ Waiting for containers to be healthy...
🔍 Checking backend health...
✅ Backend is healthy
🔍 Checking frontend health...
✅ Frontend is healthy
📁 Collecting static files...
🪣 Setting up MinIO bucket...
✅ Bucket 'projetoravenna' created and configured
📊 Container Status:
NAME                         STATUS          PORTS
projetoravenna_backend       Up 30 seconds   (healthy)
projetoravenna_frontend      Up 30 seconds   (healthy)
projetoravenna_db            Up 45 seconds   5432/tcp
projetoravenna_minio         Up 45 seconds   127.0.0.1:9000-9001->9000-9001/tcp

🎉 Deployment completed successfully!
```

**Validação:**
```bash
# Verificar status dos containers
docker-compose ps

# Todos devem estar "Up (healthy)"
```

### Passo 13: Verificar Conexão

Como o Cloudflare já estava rodando, apenas verifique se ele conseguiu resolver os novos nomes DNS internos.

```bash
# Verifique se o Cloudflare consegue pingar o backend (se tiver ping instalado)
# Ou verifique os logs do Cloudflare para erros de conexão
docker logs --tail 50 cloudflared
```

---

## 🔐 Pós-Deploy

### Passo 14: Criar Superusuário Django

```bash
cd /www/wwwroot/projetoravenna

# Executar comando de criação de superuser
docker-compose exec backend python manage.py createsuperuser
```

**Preencha os dados solicitados:**

```
Username: admin
Email address: seu@email.com
Password: ********
Password (again): ********
Superuser created successfully.
```

**Validação:**
O comando deve completar sem erros.

### Passo 15: Verificar MinIO Console

```bash
# Acessar MinIO Console localmente
echo "http://localhost:9001"

# Ou via túnel SSH (da sua máquina local):
# ssh -L 9001:localhost:9001 usuario@SEU_IP_DO_SERVIDOR
```

**Login MinIO:**
- Username: valor de `MINIO_ROOT_USER` do .env
- Password: valor de `MINIO_ROOT_PASSWORD` do .env

**Verificar:**
1. Bucket `projetoravenna` existe
2. Política de acesso está configurada

---

## ✅ Verificação e Testes

### Passo 16: Testes de Conectividade

#### 16.1. Testar Frontend

```bash
# No servidor
curl http://localhost:3001/api/health

# Deve retornar:
# {"status":"ok"}
```

**No navegador (da sua máquina):**
```
https://projetoravenna.cloud
```

**Deve carregar:** Página inicial do ProjetoRavenna

#### 16.2. Testar Backend

```bash
# No servidor
curl http://localhost:8000/health/

# Deve retornar:
# {"status":"healthy"}
```

**No navegador:**
```
https://api.projetoravenna.cloud/health/
```

**Deve retornar:** JSON com `{"status":"healthy"}`

#### 16.3. Testar Admin Django

**No navegador:**
```
https://api.projetoravenna.cloud/admin/
```

**Deve mostrar:** Tela de login do Django Admin

**Faça login** com o superuser criado no Passo 14.

#### 16.4. Testar API Documentation

**No navegador:**
```
https://api.projetoravenna.cloud/api/docs/
```

**Deve mostrar:** Swagger UI com documentação da API

### Passo 17: Verificar Logs

```bash
cd /www/wwwroot/projetoravenna

# Logs do backend
docker-compose logs -f backend

# Logs do frontend
docker-compose logs -f frontend

# Logs do Cloudflare Tunnel
docker logs -f cloudflared_projetoravenna

# Parar logs: Ctrl + C
```

**Logs normais do backend:**
```
[INFO] Gunicorn listening on 0.0.0.0:8000
[INFO] Using worker: sync
[INFO] Booting worker with pid: 123
```

**Logs normais do frontend:**
```
Ready - started server on 0.0.0.0:3001
```

### Passo 18: Checklist Final

- [ ] **Containers rodando:** `docker-compose ps` mostra todos "Up (healthy)"
- [ ] **Frontend acessível:** `https://projetoravenna.cloud` carrega
- [ ] **API acessível:** `https://api.projetoravenna.cloud/health/` retorna OK
- [ ] **Admin acessível:** `https://api.projetoravenna.cloud/admin/` carrega
- [ ] **Superuser criado:** Login no admin funciona
- [ ] **MinIO configurado:** Bucket existe e é acessível
- [ ] **Cloudflare Tunnel ativo:** Logs mostram "connected"
- [ ] **SSL ativo:** Domínios acessíveis via HTTPS

---

## 🔧 Troubleshooting

### Problema: Container não inicia

**Sintoma:**
```bash
docker-compose ps
# Mostra: Exited (1) ou Restarting
```

**Solução:**
```bash
# Ver logs do container com problema
docker-compose logs nome_do_container

# Exemplo:
docker-compose logs backend
```

**Erros comuns:**

1. **"Database connection refused"**
   - Aguardar mais tempo (banco ainda iniciando)
   - Verificar senha do banco no .env

2. **"SECRET_KEY not set"**
   - Verificar arquivo .env
   - Recriar .env baseado no .env.example

### Problema: 502 Bad Gateway

**Sintoma:** Domínio retorna erro 502 no navegador

**Causas possíveis:**

1. **Containers não estão rodando:**
   ```bash
   docker-compose ps
   # Se algum estiver Down:
   docker-compose up -d
   ```

2. **Cloudflare Tunnel não conectado:**
   ```bash
   docker logs cloudflared_projetoravenna
   # Deve mostrar "Connection registered"
   ```

3. **Nomes de containers errados no Cloudflare:**
   - Verificar configuração do Tunnel no dashboard
   - Deve usar `http://frontend:3001` e `http://backend:8000`

### Problema: Frontend carrega mas API não

**Sintoma:** Site carrega mas não consegue fazer login/buscar dados

**Solução:**
```bash
# 1. Verificar CORS no backend
docker-compose exec backend python -c "from config.settings import CORS_ALLOWED_ORIGINS; print(CORS_ALLOWED_ORIGINS)"
# Deve incluir: https://projetoravenna.cloud

# 2. Verificar CSRF
docker-compose exec backend python -c "from config.settings import CSRF_TRUSTED_ORIGINS; print(CSRF_TRUSTED_ORIGINS)"
# Deve incluir: https://api.projetoravenna.cloud

# 3. Verificar logs do backend
docker-compose logs backend | grep ERROR
```

### Problema: MinIO não conecta

**Sintoma:** Erro ao fazer upload de imagens

**Solução:**
```bash
# 1. Verificar se MinIO está rodando
docker-compose ps minio

# 2. Verificar credenciais
docker-compose exec backend python -c "from config.settings import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY; print(f'User: {AWS_ACCESS_KEY_ID}, Pass: {AWS_SECRET_ACCESS_KEY}')"

# 3. Recriar bucket
docker-compose exec minio mc mb myminio/projetoravenna --ignore-existing
docker-compose exec minio mc anonymous set download myminio/projetoravenna
```

### Problema: Espaço em disco insuficiente

**Sintoma:** Build falha com erro de espaço

**Solução:**
```bash
# Verificar espaço
df -h

# Limpar containers antigos
docker system prune -a

# Limpar volumes não utilizados (CUIDADO!)
docker volume prune
```

---

## 🔄 Manutenção

### Atualizar Aplicação

```bash
cd /www/wwwroot/projetoravenna

# 1. Fazer backup
docker-compose exec db pg_dump -U postgres projetoravenna_db | gzip > backup_manual_$(date +%Y%m%d_%H%M%S).sql.gz

# 2. Puxar código atualizado
git pull origin main

# 3. Executar deploy
./deploy.sh
```

### Backup Manual do Banco de Dados

```bash
cd /www/wwwroot/projetoravenna

# Backup comprimido
docker-compose exec -T db pg_dump -U postgres projetoravenna_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Transferir backup para sua máquina (da sua máquina local):
# scp usuario@servidor:/www/wwwroot/projetoravenna/backup_*.sql.gz ./
```

### Restaurar Backup

```bash
cd /www/wwwroot/projetoravenna

# Descompactar e restaurar
gunzip < backup_20260107_120000.sql.gz | docker-compose exec -T db psql -U postgres projetoravenna_db
```

### Ver Uso de Recursos

```bash
# CPU e Memória em tempo real
docker stats

# Espaço em disco dos volumes
docker system df -v
```

### Reiniciar Serviços

```bash
cd /www/wwwroot/projetoravenna

# Reiniciar tudo
docker-compose restart

# Reiniciar apenas backend
docker-compose restart backend

# Reiniciar apenas frontend
docker-compose restart frontend
```

---

## 📚 Comandos Úteis de Referência

```bash
# Ver todos os containers rodando
docker ps

# Ver logs em tempo real
docker-compose logs -f

# Entrar no shell do backend
docker-compose exec backend bash

# Executar comando Django
docker-compose exec backend python manage.py COMANDO

# Ver redes Docker
docker network ls

# Ver volumes Docker
docker volume ls

# Status completo
docker-compose ps -a
```

---

## 🎓 Conclusão

Parabéns! Você concluiu o deploy do ProjetoRavenna! 🎉

**Acessos:**
- 🌐 Frontend: `https://projetoravenna.cloud`
- 🔌 API: `https://api.projetoravenna.cloud/api/v1/`
- 👤 Admin: `https://api.projetoravenna.cloud/admin/`
- 📦 MinIO: `https://minio.projetoravenna.cloud` (se configurado)

**Próximos passos sugeridos:**
1. Configurar monitoramento (Sentry, New Relic, etc.)
2. Configurar backups automáticos
3. Configurar SSL/TLS adicional se necessário
4. Implementar CI/CD para deploys automáticos

---

**Suporte:**
- 📖 Documentação: `DEPLOY.md` e `QUICKSTART.md`
- 🔍 Issues: Seção de Troubleshooting acima
- 💬 Dúvidas: Criar issue no repositório

---

*Última atualização: 07/01/2026*
