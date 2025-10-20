# 🔧 Solução Active Storage - Mixed Content Rails

## 🚨 Problema Identificado

O **Active Storage do Rails** (Chatwoot) está gerando URLs HTTP para imagens e arquivos, causando **Mixed Content Error**.

### Erros Específicos:
```
Mixed Content: The page at 'https://atendimento.projetohavoc.shop' was loaded over HTTPS, 
but requested an insecure image 'http://192.168.0.121:3000/rails/active_storage/...'
This request has been blocked; the content must be served over HTTPS.
```

## 🔍 Causa do Problema

### **Active Storage URLs Problemáticas:**
- `http://192.168.0.121:3000/rails/active_storage/representations/...`
- `http://192.168.0.121:3000/rails/active_storage/blobs/...`

### **Por que acontece:**
1. Rails gera URLs baseadas no `HOST_IP` interno
2. Não reconhece que está sendo acessado via HTTPS (Cloudflare)
3. Active Storage usa protocolo HTTP por padrão

## ✅ Soluções Implementadas

### **1. Configuração Asset Host**
Adicionado no `chatwoot/.env` e `.env`:

```env
# Configurações de Asset Host para HTTPS
RAILS_ASSET_HOST=https://atendimento.projetohavoc.shop
ACTION_CONTROLLER_ASSET_HOST=https://atendimento.projetohavoc.shop
ASSET_HOST=https://atendimento.projetohavoc.shop
```

### **2. Force SSL Ativado**
```env
FORCE_SSL=true
FRONTEND_URL=https://atendimento.projetohavoc.shop
```

## 🔧 Como Funciona

### **Antes (Problemático):**
```
Rails Active Storage → Gera URL: http://192.168.0.121:3000/rails/active_storage/...
Navegador → BLOQUEIA (Mixed Content)
```

### **Depois (Corrigido):**
```
Rails Active Storage → Usa ASSET_HOST → Gera URL: https://atendimento.projetohavoc.shop/rails/active_storage/...
Navegador → PERMITE (HTTPS)
```

## 🚀 Configurações Adicionais (Se Necessário)

### **1. Headers de Proxy (Cloudflare)**
Se ainda houver problemas, adicionar no Cloudflare:
```
X-Forwarded-Proto: https
X-Forwarded-Host: atendimento.projetohavoc.shop
```

### **2. Rails Force SSL Headers**
Adicionar no `chatwoot/.env`:
```env
RAILS_FORCE_SSL=true
RAILS_ASSUME_SSL=true
```

### **3. Configuração de Protocolo**
```env
RAILS_RELATIVE_URL_ROOT=/
RAILS_SERVE_STATIC_FILES=true
```

## 🧪 Como Testar

### **1. Verificar URLs Geradas**
```bash
# Inspecionar elemento em uma imagem no Chatwoot
# URL deve começar com: https://atendimento.projetohavoc.shop/rails/active_storage/...
```

### **2. Console do Navegador**
```javascript
// DevTools → Console
// Não deve haver erros de Mixed Content para imagens
```

### **3. Network Tab**
```
DevTools → Network → Filtrar por "active_storage"
Todas as requisições devem ser HTTPS
```

## 🔄 Reinicialização Necessária

### **Importante:**
Após as alterações, é necessário **reiniciar o container do Chatwoot** para aplicar as configurações:

```bash
# No servidor (via SSH ou aaPanel Terminal):
docker-compose restart chatwoot_web chatwoot_sidekiq

# Verificar logs:
docker-compose logs -f chatwoot_web
```

## 📋 Checklist de Verificação

- [ ] `RAILS_ASSET_HOST` configurado
- [ ] `ACTION_CONTROLLER_ASSET_HOST` configurado  
- [ ] `ASSET_HOST` configurado
- [ ] `FORCE_SSL=true`
- [ ] `FRONTEND_URL` usando HTTPS
- [ ] Container Chatwoot reiniciado
- [ ] URLs de imagem usando HTTPS
- [ ] Console sem erros Mixed Content

## 🎯 Resultado Esperado

### **✅ URLs Corretas:**
```
ANTES: http://192.168.0.121:3000/rails/active_storage/...
DEPOIS: https://atendimento.projetohavoc.shop/rails/active_storage/...
```

### **✅ Funcionalidades:**
- Imagens carregando corretamente
- Upload de arquivos funcionando
- Anexos visíveis no chat
- Sem erros no console

## 🚨 Troubleshooting

### **Problema: URLs ainda HTTP**
```bash
# Verificar se variáveis foram aplicadas:
docker-compose exec chatwoot_web env | grep ASSET_HOST

# Deve mostrar:
# RAILS_ASSET_HOST=https://atendimento.projetohavoc.shop
```

### **Problema: Imagens não carregam**
1. Verificar se Cloudflare está roteando corretamente
2. Testar acesso direto: `https://atendimento.projetohavoc.shop/rails/active_storage/...`
3. Verificar logs do container

### **Problema: 404 em assets**
```bash
# Verificar se arquivos existem:
docker-compose exec chatwoot_web ls -la /app/storage/
```

---

**🎯 Status**: Configurações aplicadas - Aguardando reinicialização do container para teste final!