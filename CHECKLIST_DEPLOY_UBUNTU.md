# ✅ CHECKLIST DEPLOY UBUNTU 24.04 + aaPanel

## 📋 Pré-Deploy (No Servidor Ubuntu)

### Sistema Base
- [ ] Ubuntu 24.04 LTS instalado
- [ ] IP configurado: `192.168.0.121`
- [ ] aaPanel instalado e funcionando
- [ ] Acesso SSH configurado
- [ ] Usuário com privilégios sudo

### Dependências Docker
```bash
# Executar no servidor Ubuntu:
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install docker-compose-plugin -y
sudo reboot
```
- [ ] Docker instalado
- [ ] Docker Compose instalado
- [ ] Usuário adicionado ao grupo docker
- [ ] Sistema reiniciado

### Firewall
```bash
sudo ufw allow 3000/tcp    # Chatwoot
sudo ufw allow 8080/tcp    # Evolution API
sudo ufw allow 9000/tcp    # MinIO API
sudo ufw allow 9001/tcp    # MinIO Console
sudo ufw allow 9002/tcp    # Portainer
sudo ufw allow 5678/tcp    # n8n
sudo ufw enable
```
- [ ] Portas liberadas no firewall
- [ ] UFW ativado

## 🌐 Configuração aaPanel

### Domínios (Opcional - para SSL)
- [ ] `chatwoot.seudominio.com` criado
- [ ] `evolution.seudominio.com` criado
- [ ] `minio.seudominio.com` criado
- [ ] `portainer.seudominio.com` criado
- [ ] `n8n.seudominio.com` criado

### Reverse Proxy
- [ ] Chatwoot: `127.0.0.1:3000`
- [ ] Evolution: `127.0.0.1:8080`
- [ ] MinIO: `127.0.0.1:9001`
- [ ] Portainer: `127.0.0.1:9002`
- [ ] n8n: `127.0.0.1:5678`

### SSL (Se usando domínios)
- [ ] Certificados SSL configurados
- [ ] Force HTTPS ativado
- [ ] Redirecionamento HTTP → HTTPS

## 📁 Preparação dos Arquivos

### No Servidor Ubuntu
```bash
cd /opt
sudo git clone seu_repositorio projeto-ravenna
cd projeto-ravenna
sudo chown -R $USER:$USER .
```
- [ ] Projeto clonado/copiado para `/opt/projeto-ravenna`
- [ ] Permissões ajustadas

### Configuração .env
```bash
cp .env.ubuntu .env
nano .env
```
- [ ] Arquivo `.env.ubuntu` copiado para `.env`
- [ ] `HOST_IP` configurado: `192.168.0.121`
- [ ] URLs atualizadas (domínios ou IPs)
- [ ] SMTP configurado com provedor real
- [ ] Senhas alteradas (todas únicas)
- [ ] Tokens de segurança alterados

## 🚀 Deploy

### 1. Rede Docker
```bash
docker network create app_network
```
- [ ] Rede `app_network` criada

### 2. Infraestrutura Base
```bash
docker compose up -d postgres_chatwoot postgres_n8n postgres_evolution redis_chatwoot redis_n8n redis_evolution minio
```
- [ ] Bancos PostgreSQL iniciados
- [ ] Redis iniciados
- [ ] MinIO iniciado
- [ ] Aguardado 60 segundos

### 3. Serviços Principais
```bash
docker compose up -d chatwoot-rails chatwoot-sidekiq n8n evolution_api
```
- [ ] Chatwoot iniciado
- [ ] n8n iniciado
- [ ] Evolution API iniciado

### 4. Serviços Auxiliares
```bash
docker compose up -d portainer
# Se usar Cloudflare:
# docker compose up -d cloudflared
```
- [ ] Portainer iniciado
- [ ] Cloudflare iniciado (se aplicável)

## 🔍 Verificação

### Status dos Containers
```bash
docker compose ps
```
- [ ] Todos os containers com status "Up"
- [ ] Nenhum container com status "Exited"

### Testes de Conectividade
- [ ] Chatwoot: `http://192.168.0.121:3000` ou `https://chatwoot.seudominio.com`
- [ ] Evolution: `http://192.168.0.121:8080` ou `https://evolution.seudominio.com`
- [ ] MinIO: `http://192.168.0.121:9001` ou `https://minio.seudominio.com`
- [ ] Portainer: `http://192.168.0.121:9002` ou `https://portainer.seudominio.com`
- [ ] n8n: `http://192.168.0.121:5678` ou `https://n8n.seudominio.com`

### Logs (Se houver problemas)
```bash
docker compose logs -f chatwoot-rails
docker compose logs -f evolution_api
docker compose logs -f postgres_chatwoot
```
- [ ] Logs do Chatwoot sem erros críticos
- [ ] Logs do Evolution sem erros críticos
- [ ] Logs do PostgreSQL sem erros críticos

## ⚙️ Configuração Inicial dos Serviços

### Chatwoot
- [ ] Acesso à interface web funcionando
- [ ] Conta administrativa criada
- [ ] Senha padrão alterada
- [ ] SMTP testado (envio de email)

### Evolution API
- [ ] API respondendo
- [ ] Documentação acessível em `/manager`
- [ ] Primeira instância WhatsApp criada (teste)

### MinIO
- [ ] Console acessível
- [ ] Login com credenciais do .env
- [ ] Buckets `chatwoot` e `evolution` criados automaticamente

### Portainer
- [ ] Interface acessível
- [ ] Usuário admin criado
- [ ] Containers visíveis no dashboard

## 🔒 Segurança Final

### Senhas e Tokens
- [ ] Todas as senhas padrão alteradas
- [ ] Tokens únicos gerados
- [ ] Arquivo `.env` com permissões restritas (`chmod 600 .env`)

### Firewall
- [ ] Apenas portas necessárias abertas
- [ ] SSH com chave pública (recomendado)
- [ ] Fail2ban configurado (recomendado)

### Backup
- [ ] Script de backup configurado
- [ ] Teste de backup realizado
- [ ] Backup dos arquivos `.env`

## 📊 Monitoramento

### Recursos do Sistema
```bash
docker stats
htop
df -h
```
- [ ] CPU < 80%
- [ ] RAM < 80%
- [ ] Disco < 80%

### Logs do Sistema
```bash
journalctl -u docker
tail -f /var/log/syslog
```
- [ ] Logs do Docker sem erros
- [ ] Logs do sistema sem erros críticos

## ✅ Deploy Concluído

Quando todos os itens estiverem marcados:

**🎉 PARABÉNS! O Projeto Ravenna está funcionando no Ubuntu 24.04 + aaPanel!**

### URLs de Acesso:
- **Chatwoot**: https://chatwoot.seudominio.com (ou http://192.168.0.121:3000)
- **Evolution API**: https://evolution.seudominio.com (ou http://192.168.0.121:8080)
- **MinIO**: https://minio.seudominio.com (ou http://192.168.0.121:9001)
- **Portainer**: https://portainer.seudominio.com (ou http://192.168.0.121:9002)
- **n8n**: https://n8n.seudominio.com (ou http://192.168.0.121:5678)

### Próximos Passos:
1. Configurar integrações entre Chatwoot e Evolution
2. Configurar automações no n8n
3. Configurar backup automático
4. Monitorar performance e logs

---

**📞 Suporte**: Em caso de problemas, consulte `DEPLOY_UBUNTU_AAPANEL.md` para troubleshooting detalhado.