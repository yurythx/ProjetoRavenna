# Mobile Connection Issues - Emergency Diagnosis
**Data:** 2026-01-11 01:30  
**Severidade:** 🔴 CRÍTICA  
**Problema:** Frontend perde conexão no mobile - não lista artigos, não faz login

---

## 🔴 DIAGNÓSTICO

### Sintomas Reportados
1. ❌ Não lista artigos no mobile
2. ❌ Não consegue fazer login no mobile
3. ✅ Funciona normal no desktop/PC

### Possíveis Causas

#### 1. **API URL Hardcoded** ⚠️ ALTA PROBABILIDADE
```yaml
# docker-compose.yml linha 102  
args:
  NEXT_PUBLIC_API_URL: https://api.projetoravenna.cloud/api/v1

# linha 108
environment:
  - NEXT_PUBLIC_API_URL=https://api.projetoravenna.cloud/api/v1
```

**Problema:** Se o DNS `api.projetoravenna.cloud` não resolve no mobile OU está bloqueado, a API fica inacessível.

**Solução:** Verificar se o domínio resolve:
```bash
# No servidor
nslookup api.projetoravenna.cloud
ping api.projetoravenna.cloud

# Verificar se retorna IP válido
```

#### 2. **SSL/TLS Issues** ⚠️ ALTA PROBABILIDADE
Mobile pode estar rejeitando certificado SSL autoassinado ou inválido.

**Verificações:**
- Certificado SSL está válido?
- Certificado está instalado para `api.projetoravenna.cloud`?
- Mobile trust o certificado?

#### 3. **CORS Configurado Mas Pode Estar Bloqueando Mobile** ⚠️ MÉDIA
```python
# backend/config/settings.py linha 215
CORS_ALLOW_ALL_ORIGINS = True  # Deveria permitir mobile
CORS_ALLOW_CREDENTIALS = True
```

**Problema Potencial:** Headers específicos de mobile podem estar sendo bloqueados.

#### 4. **Timeouts Muito Baixos** ⚠️ MÉDIA
Conexões mobile podem ser mais lentas. Se não houver timeout configurado adequadamente, pode falhar.

#### 5. **Network Discovery no Docker** ⚠️ BAIXA
Backend rodando em `0.0.0.0:8000` então deve ser acessível externamente.

#### 6. **Cache do Browser Mobile** ⚠️ BAIXA
Mobile pode estar com versão antiga cached do frontend.

---

## 🔧 CORREÇÕES URGENTES

### CORREÇÃO 1: Adicionar Timeout e Retry ao Axios (CRÍTICO)

**Arquivo:** `frontend/src/lib/api.ts` (bloqueado por gitignore, precisa criar)

Criar configuração robusta:

```typescript
// frontend/src/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos (mobile pode ser lento)
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor para retry em caso de timeout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry em caso de timeout ou network error
    if (
      (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      console.warn('Network error detected, retrying...', error.message);
      
      // Aguardar 2 segundos antes de retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(originalRequest);
    }

    // Log detalhado de erro para debug
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      code: error.code,
    });

    return Promise.reject(error);
  }
);
```

### CORREÇÃO 2: Adicionar Fallback de API URL

```typescript
// frontend/src/lib/api.ts
const getAPIUrl = () => {
  // Prioridade: env var > window location > fallback
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (envUrl) return envUrl;
  
  // Se estiver no browser, tenta usar mesma origin
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    
    // Se estiver em projetoravenna.cloud, usa api.projetoravenna.cloud
    if (hostname.includes('projetoravenna.cloud')) {
      return `${protocol}//api.projetoravenna.cloud/api/v1`;
    }
    
    // Se estiver em localhost, usa localhost:8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api/v1';
    }
  }
  
  // Fallback final
  return 'http://localhost:8000/api/v1';
};

const API_URL = getAPIUrl();
```

### CORREÇÃO 3: Adicionar Network Status Detection

```typescript
// frontend/src/hooks/useNetworkStatus.ts
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Detectar conexão lenta
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const updateConnection = () => {
        setIsSlowConnection(connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g');
      };
      connection.addEventListener('change', updateConnection);
      updateConnection();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSlowConnection };
}
```

### CORREÇÃO 4: Verificar DNS e SSL no Servidor

```bash
# No servidor
# 1. Verificar se domínio resolve
nslookup api.projetoravenna.cloud

# 2. Verificar se SSL está funcionando
curl -I https://api.projetoravenna.cloud/api/v1/

# 3. Se retornar erro SSL, configurar certificado
sudo certbot --nginx -d api.projetoravenna.cloud

# 4. Verificar nginx/proxy se houver
sudo nginx -t
sudo systemctl status nginx
```

### CORREÇÃO 5: Adicionar Logging Detalhado

```typescript
// frontend/src/lib/logger.ts
export const logger = {
  api: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development' || localStorage.getItem('debug') === 'true') {
      console.log(`[API] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    
    // Em produção, poderia enviar para serviço de logging
    if (process.env.NODE_ENV === 'production') {
      // sendToLoggingService({ message, error });
    }
  }
};
```

---

## 🧪 TESTES PARA FAZER NO MOBILE

### 1. Abrir Console no Mobile
- Chrome Android: chrome://inspect
- Safari iOS: Settings > Safari > Advanced > Web Inspector

### 2. Verificar Erros de Rede
Procurar por:
- `Failed to fetch`
- `Network request failed`
- `CORS error`
- `SSL error`
- `ERR_CONNECTION_REFUSED`
- `ERR_NAME_NOT_RESOLVED`

### 3. Testar API Diretamente
No browser mobile, acessar:
```
https://api.projetoravenna.cloud/api/v1/articles/posts/?is_published=true
```

Se retornar JSON = API OK
Se der erro = Problema de SSL/DNS

### 4. Verificar Headers
No console mobile:
```javascript
fetch('https://api.projetoravenna.cloud/api/v1/articles/posts/?is_published=true', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(d => console.log('SUCCESS:', d))
.catch(e => console.error('ERROR:', e));
```

---

## 🚨 AÇÕES IMEDIATAS

### NO SERVIDOR (AGORA):

```bash
cd /home/suporte/ProjetoRavenna

# 1. Verificar DNS
dig api.projetoravenna.cloud

# 2. Verificar se backend está acessível
curl http://localhost:8000/api/v1/articles/posts/?is_published=true

# 3. Verificar HTTPS externo
curl -k https://api.projetoravenna.cloud/api/v1/articles/posts/?is_published=true

# 4. Ver logs de erro
docker compose logs backend --tail 100 | grep -i error
docker compose logs frontend --tail 100 | grep -i error

# 5. Verificar se rate limiting não está bloqueando
docker compose exec redis redis-cli KEYS "*throttle*"
```

### NO CÓDIGO (URGENTE):

1. **Criar `frontend/src/lib/api.ts` robusto** com timeout e retry
2. **Adicionar fallback de URL** baseado em window.location
3. **Implementar network status detection**
4. **Adicionar logging detalhado**

---

## 📝 CHECKLIST DE DEBUGGING

- [ ] DNS de `api.projetoravenna.cloud` resolve?
- [] SSL certificado válido e confiável?
- [ ] Backend responde em `http://localhost:8000`?
- [ ] Backend responde em `https://api.projetoravenna.cloud`?
- [ ] CORS headers presentes nas respostas?
- [ ] Rate limiting não está bloqueando?
- [ ] Frontend tem timeout adequado (30s)?
- [ ] Frontend tem retry logic?
- [ ] Console do mobile mostra erros específicos?
- [ ] API_URL está correta no build do frontend?

---

## 🎯 PRÓXIMOS PASSOS

1. **URGENTE:** Executar comandos de verificação no servidor
2. **URGENTE:** Verificar DNS e SSL
3. **IMPORTANTE:** Criar api.ts robusto com timeout/retry
4. **IMPORTANTE:** Testar API diretamente no mobile
5. **MONITORAR:** Logs de backend e frontend após correções

---

**Status:** ⚠️ AGUARDANDO DIAGNÓSTICO DO SERVIDOR  
**Prioridade:** 🔴 MÁXIMA  
**ETA:** 30 minutos após execução dos comandos
