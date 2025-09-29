# 🚀 Ordem de Inicialização dos Serviços

## 📋 Sequência Recomendada

### 1. Serviços Base (Infraestrutura)
```powershell
# PostgreSQL - Banco de dados principal
docker-compose -f postgres/postgres.yml up -d

# Redis - Cache e sessões
docker-compose -f redis/redis.yml up -d

# MinIO - Armazenamento de objetos
docker-compose -f minio/minio.yml up -d
```

### 2. Serviços de Aplicação
```powershell
# Evolution API - API do WhatsApp
docker-compose -f evolution/evolution.yml up -d

# Chatwoot - Plataforma de atendimento
docker-compose -f chatwoot/chatwoot.yml up -d

# N8N - Automação (opcional)
docker-compose -f n8n/n8n.yml up -d
```

### 3. Serviços de Infraestrutura Externa
```powershell
# Cloudflare Tunnel - Acesso externo
docker-compose -f cloudflare/cloudflare.yml up -d
```

## 🔧 Script Automatizado para Windows

### Inicialização Completa
```powershell
# Iniciar todos os serviços na ordem correta
docker-compose up -d

# Verificar status
.\monitor-services.ps1
```

### Parada Segura
```powershell
# Parar todos os serviços
docker-compose down

# Parada com limpeza de volumes (cuidado!)
docker-compose down -v
```

## 🔧 Script de Inicialização Automática

### Para Ubuntu/aaPanel:
```bash
#!/bin/bash
# startup.sh - Script otimizado para servidor Ubuntu

echo "🚀 Iniciando Projeto Ravenna..."

# Nível 1: Infraestrutura
echo "📊 Subindo infraestrutura base..."
docker-compose -f postgres/postgres.yml up -d
docker-compose -f redis/redis.yml up -d
docker-compose -f minio/minio.yml up -d

echo "⏳ Aguardando estabilização da infraestrutura (60s)..."
sleep 60

# Verificar se serviços base estão rodando
echo "🔍 Verificando serviços base..."
docker-compose -f postgres/postgres.yml ps
docker-compose -f redis/redis.yml ps
docker-compose -f minio/minio.yml ps

# Nível 2: Aplicações
echo "🎯 Subindo aplicações principais..."
docker-compose -f chatwoot/chatwoot.yml up -d
sleep 30
docker-compose -f n8n/n8n.yml up -d
sleep 30
docker-compose -f evolution/evolution.yml up -d

echo "⏳ Aguardando inicialização das aplicações (120s)..."
sleep 120

# Nível 3: Serviços opcionais
echo "🌐 Subindo serviços opcionais..."
docker-compose -f cloudflare/cloudflare.yml up -d

echo "✅ Projeto Ravenna iniciado com sucesso!"
echo "🔗 Acesse os serviços:"
echo "   - Chatwoot: http://seu-ip:3000"
echo "   - N8N: http://seu-ip:5678"
echo "   - Evolution API: http://seu-ip:8080"
echo "   - MinIO: http://seu-ip:9001"
```

## 🛑 Script de Parada Segura

```bash
#!/bin/bash
# shutdown.sh - Parada segura dos serviços

echo "🛑 Parando Projeto Ravenna de forma segura..."

# Parar na ordem inversa
echo "🌐 Parando serviços opcionais..."
docker-compose -f cloudflare/cloudflare.yml down

echo "🎯 Parando aplicações principais..."
docker-compose -f evolution/evolution.yml down
docker-compose -f n8n/n8n.yml down
docker-compose -f chatwoot/chatwoot.yml down

echo "📊 Parando infraestrutura..."
docker-compose -f minio/minio.yml down
docker-compose -f redis/redis.yml down
docker-compose -f postgres/postgres.yml down

echo "✅ Todos os serviços foram parados com segurança!"
```

## 🔍 Monitoramento de Saúde

```bash
#!/bin/bash
# health-check.sh - Verificar status de todos os serviços

echo "🏥 Verificando saúde dos serviços..."

services=("postgres/postgres.yml" "redis/redis.yml" "minio/minio.yml" "chatwoot/chatwoot.yml" "n8n/n8n.yml" "evolution/evolution.yml" "cloudflare/cloudflare.yml")

for service in "${services[@]}"; do
    echo "Verificando $service..."
    docker-compose -f "$service" ps
    echo "---"
done
```

## ⚠️ Considerações para aaPanel

1. **Firewall**: Libere as portas necessárias no aaPanel
2. **Recursos**: Monitore CPU/RAM durante a inicialização
3. **Logs**: Use `docker-compose logs -f` para acompanhar
4. **Backup**: Configure backup automático dos volumes
5. **SSL**: Configure certificados SSL através do aaPanel