# 📊 Monitoramento dos Serviços - Projeto Ravenna

## 🎯 Visão Geral

Este documento descreve as ferramentas de monitoramento implementadas para acompanhar o status dos serviços do Projeto Ravenna, incluindo Evolution API, Chatwoot, PostgreSQL, Redis e MinIO.

## 🛠️ Ferramentas Disponíveis

### 1. Script de Monitoramento Automático

**Arquivo:** `monitor-services.ps1`

**Funcionalidades:**
- ✅ Verificação do status de todos os containers Docker
- 🌐 Teste de conectividade dos serviços web
- 📱 Monitoramento das instâncias WhatsApp
- 📈 Estatísticas de uso de recursos (CPU/Memória)
- 🎨 Interface colorida para fácil identificação de problemas

**Como usar:**
```powershell
# Executar no diretório do projeto
.\monitor-services.ps1
```

### 2. Comandos Manuais Úteis

#### Verificar Status dos Containers
```bash
docker ps
```

#### Verificar Logs de um Serviço Específico
```bash
# Evolution API
docker logs evolution_api --tail 20

# Chatwoot Rails
docker logs projetoravenna-chatwoot-rails-1 --tail 20

# Chatwoot Sidekiq
docker logs chatwoot-sidekiq --tail 20
```

#### Verificar Instâncias WhatsApp via API
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/instance/fetchInstances" -Headers @{"apikey"="ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f_super_segura_2024"} -Method GET
```

## 🔧 Recomendações Implementadas

### ✅ 1. Atualização do Evolution API
- **Status:** Concluído
- **Versão:** Atualizada para `latest` (mais recente disponível)
- **Benefícios:** Melhor estabilidade e correções de bugs

### ✅ 2. Verificação das Instâncias WhatsApp
- **Status:** Concluído
- **Instâncias encontradas:** 2 (`teste_chatwoot_v2` e `teste_chatwoot`)
- **Status atual:** Ambas em modo "connecting"
- **QR Codes:** Gerados e disponíveis para conexão

### ✅ 3. Monitoramento Básico
- **Status:** Concluído
- **Script criado:** `monitor-services.ps1`
- **Funcionalidades:** Monitoramento completo automatizado

## 📋 Status Atual dos Serviços

| Serviço | Status | Porta | Observações |
|---------|--------|-------|-------------|
| Evolution API | ✅ Running | 8080 | Atualizado e funcionando |
| Chatwoot Rails | ✅ Running | 3000 | Funcionando normalmente |
| Chatwoot Sidekiq | ✅ Running | - | Processamento de jobs ativo |
| PostgreSQL | ✅ Running | 5432 | Banco de dados estável |
| Redis | ✅ Running | 6379 | Cache funcionando |
| MinIO | ✅ Running | 9000/9001 | Armazenamento de arquivos |

## 🚨 Problemas Identificados e Soluções

### 1. Instâncias WhatsApp Desconectadas
**Problema:** Instâncias em status "connecting"
**Solução:** QR Codes gerados - necessário escanear com WhatsApp

### 2. Cloudflare Tunnel
**Problema:** Container em loop de reinicialização
**Recomendação:** Investigar configurações de autenticação

## 🔄 Rotina de Monitoramento Recomendada

### Diário
- Executar `.\monitor-services.ps1` para verificação geral
- Verificar logs em caso de problemas

### Semanal
- Verificar atualizações disponíveis dos containers
- Revisar uso de recursos e performance

### Mensal
- Backup dos dados do PostgreSQL
- Limpeza de logs antigos
- Revisão das configurações de segurança

## 🔗 URLs de Acesso

- **Evolution API:** http://localhost:8080
- **Chatwoot:** http://localhost:3000
- **MinIO Console:** http://localhost:9001
- **PostgreSQL:** localhost:5432

## 🔑 Informações de Autenticação

### Evolution API
- **API Key:** `ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f_super_segura_2024`

### PostgreSQL
- **Usuário:** postgres
- **Senha:** minha_senha_super_segura_2024!
- **Databases:** evolution, chatwoot

### MinIO
- **Access Key:** LnOfRyvjGQ7XWTidwfbj
- **Secret Key:** X22BmmluK6qFXduEsM54NOp9IHfToVNKt59iX4cM

## 📞 Próximos Passos

1. **Conectar Instâncias WhatsApp:** Escanear QR Codes gerados
2. **Investigar Cloudflare Tunnel:** Resolver problema de reinicialização
3. **Otimizar Performance:** Monitorar uso de recursos
4. **Implementar Alertas:** Configurar notificações automáticas
5. **Backup Automatizado:** Implementar rotina de backup

## 🆘 Solução de Problemas

### Container não inicia
```bash
docker logs <container_name>
docker-compose up -d <service_name>
```

### Problemas de conectividade
```bash
docker network inspect app_network
docker exec <container> ping <target_container>
```

### Problemas de performance
```bash
docker stats
docker system df
docker system prune
```

---

**Última atualização:** $(Get-Date)
**Versão do documento:** 1.0