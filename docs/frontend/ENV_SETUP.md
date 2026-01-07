# 🚀 Quick Setup - Environment Variables

## Passo 1: Criar arquivo de variáveis

Crie o arquivo `.env.local` na raiz do diretório `frontend/`:

```bash
cd frontend
touch .env.local  # Linux/Mac
# ou
type nul > .env.local  # Windows
```

## Passo 2: Adicionar suas URLs

Copie e cole o conteúdo abaixo no `.env.local`, substituindo pelos seus domínios reais:

```env
# ======================================
# MICROSERVICES URLs
# ======================================

# Streaming de Mídia
NEXT_PUBLIC_URL_JELLYFIN=https://jellyfin.seudominio.com

# Biblioteca de eBooks/Quadrinhos
NEXT_PUBLIC_URL_KOMGA=https://komga.seudominio.com

# WhatsApp Automation API
NEXT_PUBLIC_URL_EVOLUTION=https://evolution.seudominio.com

# Central de Atendimento
NEXT_PUBLIC_URL_CHATWOOT=https://chatwoot.seudominio.com

# Workflow Automation
NEXT_PUBLIC_URL_N8N=https://n8n.seudominio.com

# ======================================
# BACKEND API
# ======================================

# API Django (Development)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# API Django (Production - descomente quando for fazer deploy)
# NEXT_PUBLIC_API_URL=https://api.seudominio.com/api/v1
```

## Passo 3: Reiniciar o servidor

```bash
# Pare o servidor (Ctrl+C) e reinicie
npm run dev
```

## ✅ Verificação

Acesse `http://localhost:3000` e verifique se:
- Os cards dos serviços aparecem corretamente
- Os links externos apontam para suas URLs
- O card "Artigos & Blog" aponta para `/artigos`

## 🔒 Segurança

**IMPORTANTE**: O arquivo `.env.local` já está no `.gitignore`. Nunca commite este arquivo!

## 📝 Exemplo Completo com Domínios Reais

```env
# Exemplo com domínios reais (substitua pelos seus)
NEXT_PUBLIC_URL_JELLYFIN=https://jellyfin.meusite.com.br
NEXT_PUBLIC_URL_KOMGA=https://komga.meusite.com.br
NEXT_PUBLIC_URL_EVOLUTION=https://evo.meusite.com.br
NEXT_PUBLIC_URL_CHATWOOT=https://chat.meusite.com.br
NEXT_PUBLIC_URL_N8N=https://auto.meusite.com.br
NEXT_PUBLIC_API_URL=https://api.meusite.com.br/api/v1
```

## 🐳 Usando Localhost/Docker?

Se estiver rodando tudo localmente:

```env
NEXT_PUBLIC_URL_JELLYFIN=http://localhost:8096
NEXT_PUBLIC_URL_KOMGA=http://localhost:8080
NEXT_PUBLIC_URL_EVOLUTION=http://localhost:8081
NEXT_PUBLIC_URL_CHATWOOT=http://localhost:3000
NEXT_PUBLIC_URL_N8N=http://localhost:5678
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## ❓ FAQ

**P: E se eu não tiver algum serviço ainda?**  
R: Tudo bem! Deixe a URL padrão ou use `#` temporariamente.

**P: Posso usar IPs em vez de domínios?**  
R: Sim! Ex: `http://192.168.1.100:8096`

**P: Preciso reiniciar sempre que alterar?**  
R: Sim, variáveis `NEXT_PUBLIC_*` são compiladas no build.

---

Pronto! Seu portal de microserviços está configurado! 🎉
