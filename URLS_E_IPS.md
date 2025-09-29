# 🌐 URLs e IPs - Projeto Ravenna

## 📍 Configuração Atual de IPs

**IP Configurado**: `192.168.1.74` (exemplo para rede local)
**Total de ocorrências**: 8 locais em 4 arquivos
**Tempo para alteração**: ~5 minutos

## ⚡ Alteração Rápida com Script

### 🔧 Script PowerShell Automático

```powershell
# Substitui o IP em todos os arquivos automaticamente
$oldIP = "192.168.1.74"
$newIP = Read-Host "Digite o novo IP"

$files = @("chatwoot/chatwoot.yml", "n8n/n8n.yml", "evolution/evolution.yml", "minio/minio.yml")

foreach ($file in $files) {
    if (Test-Path $file) {
        (Get-Content $file) -replace $oldIP, $newIP | Set-Content $file
        Write-Host "✅ $file atualizado" -ForegroundColor Green
    } else {
        Write-Host "❌ $file não encontrado" -ForegroundColor Red
    }
}

Write-Host "🎉 Alteração concluída! Novo IP: $newIP" -ForegroundColor Cyan
```

## 📁 Alteração Manual por Arquivo

### 1. `chatwoot/chatwoot.yml`
```yaml
# Linhas que precisam ser alteradas:
FRONTEND_URL: "http://192.168.1.74:3000"
STORAGE_ENDPOINT: "http://192.168.1.74:9002"
```

### 2. `n8n/n8n.yml`
```yaml
# Linhas que precisam ser alteradas (3 serviços):
N8N_HOST: 192.168.1.74:5678
N8N_EDITOR_BASE_URL: https://192.168.1.74:5678/
WEBHOOK_URL: http://192.168.1.74:5678/
```

### 3. `evolution/evolution.yml`
```yaml
# Linha que precisa ser alterada:
SERVER_URL: http://192.168.1.74:8080
```

### 4. `minio/minio.yml`
```yaml
# Linhas que precisam ser alteradas:
MINIO_BROWSER_REDIRECT_URL: http://192.168.1.74:9001
MINIO_SERVER_URL: http://192.168.1.74:9002
```

## 🚪 Portas dos Serviços

| Serviço | Porta | URL de Acesso | Descrição |
|---------|-------|---------------|-----------|
| **Chatwoot** | 3000 | http://seu-ip:3000 | Interface principal de atendimento |
| **N8N Editor** | 5678 | http://seu-ip:5678 | Editor de automações |
| **Evolution API** | 8080 | http://seu-ip:8080 | API do WhatsApp |
| **MinIO Console** | 9001 | http://seu-ip:9001 | Console de administração |
| **MinIO API** | 9002 | http://seu-ip:9002 | API S3 para armazenamento |
| **PostgreSQL** | 5432 | - | Banco de dados (interno) |
| **Redis** | 6379 | - | Cache e filas (interno) |

## 🔧 Script de Substituição Automática

Para facilitar a alteração do IP, você pode usar este script PowerShell:

```powershell
# Substitua 'SEU_NOVO_IP' pelo IP real do seu servidor
$novoIP = "SEU_NOVO_IP"
$ipAtual = "192.168.1.74"

# Lista de arquivos para alterar
$arquivos = @(
    "chatwoot/chatwoot.yml",
    "n8n/n8n.yml", 
    "evolution/evolution.yml",
    "minio/minio.yml"
)

foreach ($arquivo in $arquivos) {
    if (Test-Path $arquivo) {
        Write-Host "Alterando IP em $arquivo..."
        (Get-Content $arquivo) -replace $ipAtual, $novoIP | Set-Content $arquivo
        Write-Host "✅ $arquivo atualizado"
    } else {
        Write-Host "❌ Arquivo $arquivo não encontrado"
    }
}

Write-Host "🎉 Substituição concluída! Novo IP: $novoIP"
```

## 🌍 URLs Externas Configuradas

### Evolution API - WhatsApp Business
```yaml
WA_BUSINESS_URL: https://graph.facebook.com
```

### GitHub (README.md)
```yaml
# URLs que precisam ser atualizadas no README:
- https://github.com/seu-usuario/ProjetoRavenna.git
- https://github.com/seu-usuario/ProjetoRavenna/issues
- https://github.com/seu-usuario/ProjetoRavenna/wiki
- https://github.com/seu-usuario/ProjetoRavenna/discussions
```

## 🔍 Como Descobrir Seu IP

### IP Local (Rede Interna)
```bash
# Windows
ipconfig | findstr "IPv4"

# Linux/Mac
ip addr show | grep inet
```

### IP Público (Internet)
```bash
curl ifconfig.me
```

## 🌐 Configuração para Produção

### Opção 1: IP Público + Firewall
- Configure seu roteador para encaminhar as portas
- Configure firewall para permitir apenas portas necessárias
- Use HTTPS com certificados SSL

### Opção 2: Cloudflare Tunnel (Recomendado)
- Não precisa de IP público
- SSL automático
- Proteção DDoS incluída
- Configure o token em `cloudflare/cloudflare.yml`

### Opção 3: VPN/VPS
- Use um servidor VPS com IP fixo
- Configure VPN para acesso seguro
- Mantenha backups regulares

## 🔒 Considerações de Segurança

### IPs Privados (Seguros para rede local)
- `192.168.x.x` - Rede doméstica/empresarial
- `10.x.x.x` - Rede empresarial
- `172.16.x.x - 172.31.x.x` - Rede empresarial

### IPs Públicos (Cuidado especial)
- Configure firewall rigorosamente
- Use apenas HTTPS
- Implemente autenticação forte
- Monitore logs de acesso

## 🛠️ Troubleshooting de Conectividade

### Problema: Serviços não se comunicam
```bash
# Verificar se a rede Docker existe
docker network ls | grep app_network

# Criar a rede se não existir
docker network create app_network
```

### Problema: Não consigo acessar pela rede
```bash
# Verificar se as portas estão abertas
netstat -an | findstr ":3000"
netstat -an | findstr ":5678"
netstat -an | findstr ":8080"
```

### Problema: URLs não funcionam
1. Verifique se o IP está correto
2. Confirme se os serviços estão rodando
3. Teste conectividade: `ping seu-ip`
4. Verifique firewall local e do servidor

## 📝 Checklist de Configuração

- [ ] IP alterado em todos os arquivos YAML
- [ ] Portas liberadas no firewall
- [ ] Rede Docker criada (`app_network`)
- [ ] Serviços testados individualmente
- [ ] URLs de acesso funcionando
- [ ] SSL/HTTPS configurado (produção)
- [ ] Backup das configurações realizado

---

**💡 Dica**: Sempre teste as alterações em ambiente de desenvolvimento antes de aplicar em produção!