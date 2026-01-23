# Guia de Configuração de Domínio - Produção

## 📋 Arquivo Criados

1. **nginx/projetoravenna.conf** - Configuração NGINX para reverse proxy
2. **backend/.env** - Atualizado com CORS e ALLOWED_HOSTS

---

## 🔧 Passos para Configurar no Servidor

### 1. Instalar e Configurar NGINX

```bash
# No servidor
sudo apt update
sudo apt install nginx -y

# Copiar configuração
sudo cp nginx/projetoravenna.conf /etc/nginx/sites-available/projetoravenna
sudo ln -s /etc/nginx/sites-available/projetoravenna /etc/nginx/sites-enabled/

# Remover configuração padrão
sudo rm /etc/nginx/sites-enabled/default

# Criar diretório para certificados temporários
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/selfsigned.key \
  -out /etc/nginx/ssl/selfsigned.crt \
  -subj "/C=BR/ST=MT/L=Rondonopolis/O=ProjetoRavenna/CN=projetoravenna.cloud"

# Testar configuração
sudo nginx -t

# Reiniciar NGINX
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 2. Configurar DNS

No seu provedor de domínio (Registro.br, Cloudflare, etc), configure:

```
Tipo    Nome    Valor
A       @       <IP_DO_SERVIDOR>
A       www     <IP_DO_SERVIDOR>
A       api     <IP_DO_SERVIDOR>
```

### 3. Configurar SSL com Let's Encrypt

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificados
sudo certbot --nginx -d projetoravenna.cloud -d www.projetoravenna.cloud -d api.projetoravenna.cloud

# Editar nginx/projetoravenna.conf e descomentar as linhas SSL
# Comentar as linhas de certificado self-signed

# Renovação automática já está configurada
```

### 4. Atualizar Backend (.env no servidor)

```bash
# No servidor, edite o .env
nano backend/.env
```

Adicione:
```env
ALLOWED_HOSTS=localhost,127.0.0.1,.projetoravenna.cloud,api.projetoravenna.cloud,192.168.1.121

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.121:3001,https://projetoravenna.cloud,https://www.projetoravenna.cloud,https://api.projetoravenna.cloud
```

### 5. Restart dos Serviços

```bash
# Restart containers
docker-compose down
docker-compose up -d

# Restart NGINX
sudo systemctl restart nginx
```

---

## 🧪 Testar Configuração

```bash
# Testar backend via domínio
curl https://api.projetoravenna.cloud/api/v1/entities/config/

# Testar frontend
curl http://projetoravenna.cloud
```

---

## 📊 Estrutura de Domínios

| Domínio | Porta Local | Serviço |
|---------|-------------|---------|
| `projetoravenna.cloud` | 3001 | Frontend |
| `www.projetoravenna.cloud` | 3001 | Frontend |
| `api.projetoravenna.cloud` | 8001 | Backend API |

---

## ⚠️ Troubleshooting

### CORS ainda bloqueando

```bash
# Ver logs do backend
docker-compose logs backend

# Verificar se .env foi carregado
docker-compose exec backend printenv | grep CORS
```

### Domínio não resolve

```bash
# Testar DNS
nslookup api.projetoravenna.cloud
dig api.projetoravenna.cloud
```

### NGINX não inicia

```bash
# Ver logs
sudo journalctl -u nginx -n 50

# Testar configuração
sudo nginx -t
```
