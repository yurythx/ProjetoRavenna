# 🔒 Solução para Erro Mixed Content (HTTPS/HTTP)

## 🚨 Problema Identificado

Você está enfrentando o erro **Mixed Content** que acontece quando:
- Sua página é carregada via **HTTPS** (Cloudflare Tunnel)
- Mas tenta acessar recursos via **HTTP** (IPs locais)
- O navegador bloqueia por segurança

### Erros Específicos:
```
Failed to load resource: the server responded with a status of 404
Mixed Content: The page at 'https://chatwoot.seudominio.com' was loaded over HTTPS, 
but requested an insecure element 'http://192.168.1.121:8080'. 
This request was not upgraded to HTTPS because its URL's host is an IP address.
```

## 🔧 Causa do Problema

### Configuração Atual (Problemática):
- **Chatwoot**: Acesso via HTTPS (Cloudflare)
- **Evolution API**: Configurado com IP HTTP interno
- **Resultado**: Mixed Content Error ❌

### Fluxo Problemático:
```
Usuário → HTTPS://chatwoot.seudominio.com → Tenta acessar → HTTP://192.168.1.121:8080 ❌
```

## ✅ Soluções

### **SOLUÇÃO 1: Configurar Evolution via Cloudflare (RECOMENDADA)**

#### 1.1 Adicionar Evolution ao Túnel Cloudflare
No painel Cloudflare, adicione:
- **Subdomain**: `evolution`
- **Domain**: `seudominio.com`
- **Service**: HTTP
- **URL**: `192.168.1.121:8080`

#### 1.2 Atualizar Configurações do Evolution
Editar `evolution/.env`:
```env
# Alterar de:
SERVER_URL=http://evolution_api:8080

# Para:
SERVER_URL=https://evolution.seudominio.com
```

#### 1.3 Atualizar Configurações do Chatwoot
Se houver referências ao Evolution no Chatwoot, usar:
```env
EVOLUTION_API_URL=https://evolution.seudominio.com
```

### **SOLUÇÃO 2: Configurar Proxy Reverso no aaPanel**

#### 2.1 Criar Site no aaPanel
- **Domain**: `evolution.seudominio.com`
- **Document Root**: `/www/wwwroot/evolution` (pode ser vazio)

#### 2.2 Configurar Reverse Proxy
No aaPanel → Website → Reverse Proxy:
```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
    
    # Headers específicos para Evolution API
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_cache_bypass $http_upgrade;
}
```

#### 2.3 Configurar SSL
- Ativar SSL no aaPanel para `evolution.seudominio.com`
- Usar Let's Encrypt ou certificado próprio

### **SOLUÇÃO 3: Configurar CORS e Headers (Complementar)**

#### 3.1 Adicionar Headers no Evolution
Criar arquivo `evolution/nginx.conf`:
```nginx
server {
    listen 8080;
    
    # Headers de segurança
    add_header Access-Control-Allow-Origin "https://chatwoot.seudominio.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials true always;
    
    # Permitir conteúdo misto (temporário)
    add_header Content-Security-Policy "upgrade-insecure-requests" always;
    
    location / {
        proxy_pass http://evolution_api:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🚀 Implementação Passo a Passo

### **PASSO 1: Configurar Evolution no Cloudflare**

1. **Acessar painel Cloudflare**
   - Vá para seu túnel existente
   - Aba "Public Hostname"
   - Clique "Add a public hostname"

2. **Configurar rota Evolution**
   - **Subdomain**: `evolution`
   - **Domain**: `seudominio.com`
   - **Service**: HTTP
   - **URL**: `192.168.1.121:8080`
   - Salvar

### **PASSO 2: Atualizar Configurações**

Editar `evolution/.env`:
```env
# Linha 17 - alterar de:
SERVER_URL=http://evolution_api:8080

# Para (substitua pelo seu domínio):
SERVER_URL=https://evolution.seudominio.com
```

### **PASSO 3: Reiniciar Serviços**
```bash
# Reiniciar Evolution API
docker compose restart evolution_api

# Verificar logs
docker compose logs -f evolution_api
```

### **PASSO 4: Testar Integração**

1. **Acessar Chatwoot**: `https://chatwoot.seudominio.com`
2. **Configurar webhook Evolution**: `https://evolution.seudominio.com`
3. **Testar envio de arquivos**

## 🔍 Verificação e Testes

### Testar URLs:
```bash
# Evolution via Cloudflare
curl -I https://evolution.seudominio.com

# Deve retornar 200 OK com headers HTTPS
```

### Verificar no Navegador:
1. Abrir DevTools (F12)
2. Aba Console
3. Não deve haver erros de Mixed Content
4. Aba Network - verificar se requests são HTTPS

## 🛠️ Troubleshooting

### Problema: Evolution não responde via HTTPS
```bash
# Verificar se container está rodando
docker ps | grep evolution

# Verificar logs
docker compose logs evolution_api

# Testar acesso local
curl http://192.168.1.121:8080
```

### Problema: Ainda há Mixed Content
1. Verificar se todas as URLs estão HTTPS
2. Limpar cache do navegador
3. Verificar configurações do Chatwoot
4. Verificar headers de resposta

### Problema: Certificado SSL inválido
1. Aguardar propagação DNS (até 24h)
2. Verificar configuração no Cloudflare
3. Forçar renovação de certificado

## 📋 Checklist de Correção

- [ ] Evolution adicionado ao túnel Cloudflare
- [ ] `SERVER_URL` atualizado para HTTPS
- [ ] Serviços reiniciados
- [ ] Teste de acesso HTTPS funcionando
- [ ] Console do navegador sem erros Mixed Content
- [ ] Upload de arquivos funcionando
- [ ] Integração Chatwoot ↔ Evolution testada

## 💡 Dicas Importantes

### ✅ **Boas Práticas:**
- Sempre usar HTTPS em produção
- Configurar todos os serviços no mesmo túnel
- Testar em navegador privado/incógnito
- Verificar logs regularmente

### ⚠️ **Evitar:**
- Misturar HTTP e HTTPS
- Usar IPs em URLs de produção
- Ignorar erros de certificado
- Desabilitar verificações de segurança

---

**✅ Resultado**: Todos os serviços acessíveis via HTTPS sem erros de Mixed Content!