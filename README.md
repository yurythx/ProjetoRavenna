# 🚀 Projeto Ravenna

## 📋 Visão Geral

O **Projeto Ravenna** é uma solução integrada de comunicação e automação empresarial que combina múltiplas tecnologias para fornecer uma plataforma completa de:

- ✅ **Atendimento ao cliente multicanal**
- ✅ **Automação de fluxos de trabalho**
- ✅ **Integração nativa com WhatsApp**
- ✅ **Armazenamento seguro de arquivos**
- ✅ **Acesso externo protegido**

Este projeto utiliza contêineres Docker para facilitar a implantação, escalabilidade e manutenção da infraestrutura.

## 🔧 Componentes Principais

### 1. 💬 Chatwoot (v4.6.0)

**Plataforma de atendimento ao cliente** que permite gerenciar conversas de múltiplos canais em um único local.

- **Serviços**: 
  - `chatwoot-rails` (aplicação web principal)
  - `chatwoot-sidekiq` (processamento em segundo plano)
- **Porta**: 3000
- **Dependências**: PostgreSQL, Redis, MinIO
- **Configuração**: <mcfile name="chatwoot.yml" path="./chatwoot/chatwoot.yml"></mcfile>

### 2. 🗄️ PostgreSQL (v16)

**Banco de dados relacional** principal utilizado por todos os serviços do projeto.

- **Porta**: 5432
- **Recursos**: Suporte a extensões (pgvector para IA)
- **Volumes**: Dados persistentes, extensões e bibliotecas
- **Configuração**: <mcfile name="postgres.yml" path="./postgres/postgres.yml"></mcfile>

### 3. ⚡ Redis (v8.2)

**Armazenamento em memória** utilizado para cache, sessões e filas de mensagens.

- **Porta**: 6379
- **Recursos**: Persistência AOF habilitada
- **Configuração**: <mcfile name="redis.yml" path="./redis/redis.yml"></mcfile>

### 4. 📦 MinIO (RELEASE.2025-09-07T16-13-09Z)

**Serviço de armazenamento** compatível com S3 para arquivos, mídias e backups.

- **Portas**: 
  - 9002 (API S3)
  - 9001 (console de administração)
- **Credenciais padrão**: admin/minha_senha
- **Configuração**: <mcfile name="minio.yml" path="./minio/minio.yml"></mcfile>

### 5. 🔄 N8N (v1.112.5)

**Plataforma de automação** de fluxos de trabalho e integrações.

- **Serviços**:
  - `n8n_editor` (interface de criação)
  - `n8n_webhook` (recebimento de webhooks)
  - `n8n_worker` (execução de fluxos)
- **Porta**: 5678
- **Configuração**: <mcfile name="n8n.yml" path="./n8n/n8n.yml"></mcfile>

### 6. 📱 Evolution API (v2.3.4)

**API de integração com WhatsApp** para envio e recebimento de mensagens.

- **Porta**: 8080
- **Recursos**: Integração nativa com Chatwoot
- **Configuração**: <mcfile name="evolution.yml" path="./evolution/evolution.yml"></mcfile>

### 7. 🌐 Cloudflare Tunnel (latest)

**Túnel seguro** para expor serviços internos na internet sem IP público.

- **Recursos**: Acesso HTTPS automático, proteção DDoS
- **Configuração**: <mcfile name="cloudflare.yml" path="./cloudflare/cloudflare.yml"></mcfile>

## 🌐 Arquitetura de Rede

Todos os serviços compartilham uma **rede Docker externa** chamada `app_network` para comunicação segura entre contêineres.

```bash
# Criar a rede antes da primeira execução
docker network create app_network
```

## 📋 Requisitos do Sistema

### Requisitos Mínimos
- **Docker**: versão 20.10 ou superior
- **Docker Compose**: versão 2.0 ou superior
- **RAM**: 4GB disponíveis
- **Armazenamento**: 20GB de espaço livre
- **Sistema Operacional**: Linux, Windows 10/11, macOS

### Portas Utilizadas
| Serviço | Porta | Descrição |
|---------|-------|-----------|
| Chatwoot | 3000 | Interface web |
| PostgreSQL | 5432 | Banco de dados |
| Redis | 6379 | Cache e filas |
| MinIO API | 9000 | API S3 |
| MinIO Console | 9001 | Interface administrativa |
| N8N | 5678 | Automação |
| Evolution API | 8080 | WhatsApp API |

## 🚀 Instalação Rápida

### Opção 1: Instalação Completa (Recomendada)

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/ProjetoRavenna.git
cd ProjetoRavenna

# 2. Crie a rede Docker
docker network create app_network

# 3. Inicie todos os serviços
docker compose up -d
```

### Opção 2: Instalação Manual (Passo a Passo)

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/ProjetoRavenna.git
cd ProjetoRavenna

# 2. Crie a rede Docker
docker network create app_network

# 3. Inicie os serviços na ordem recomendada:

# Infraestrutura base
docker-compose -f postgres/postgres.yml up -d
docker-compose -f redis/redis.yml up -d
docker-compose -f minio/minio.yml up -d

# Aguarde 30 segundos para inicialização completa
sleep 30

# Aplicações principais
docker-compose -f chatwoot/chatwoot.yml up -d
docker-compose -f n8n/n8n.yml up -d
docker-compose -f evolution/evolution.yml up -d

# Túnel externo (opcional)
docker-compose -f cloudflare/cloudflare.yml up -d
```

## ⚙️ Configuração Inicial

### 🔧 Configurações Obrigatórias

Antes de usar o sistema, você **DEVE** alterar as seguintes configurações:

#### 1. Credenciais de Banco de Dados
Edite os arquivos e altere as senhas padrão:
- PostgreSQL: `minha_senha` → sua senha segura
- MinIO: `admin/minha_senha` → suas credenciais

#### 2. URLs e IPs
Substitua `192.168.1.74` pelo IP real do seu servidor nos arquivos:
- <mcfile name="chatwoot.yml" path="./chatwoot/chatwoot.yml"></mcfile>
- <mcfile name="n8n.yml" path="./n8n/n8n.yml"></mcfile>
- <mcfile name="minio.yml" path="./minio/minio.yml"></mcfile>

#### 3. Configuração SMTP (Chatwoot)
Configure seu provedor de e-mail em <mcfile name="chatwoot.yml" path="./chatwoot/chatwoot.yml"></mcfile>:
```yaml
SMTP_USERNAME: seu-email@gmail.com
SMTP_PASSWORD: sua-senha-de-app
```

#### 4. Token do Cloudflare
Substitua `seu-toke` pelo token real em <mcfile name="cloudflare.yml" path="./cloudflare/cloudflare.yml"></mcfile>

### 🎯 Primeiros Passos

#### Chatwoot (Atendimento)
1. Acesse: `http://seu-ip:3000`
2. Crie conta de administrador
3. Configure canais de comunicação
4. Integre com Evolution API

#### N8N (Automação)
1. Acesse: `http://seu-ip:5678`
2. Configure conta inicial
3. Importe workflows prontos
4. Configure integrações

#### Evolution API (WhatsApp)
1. Acesse: `http://seu-ip:8080`
2. Use a API key: `ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f`
3. Crie instância do WhatsApp
4. Escaneie QR Code

#### MinIO (Armazenamento)
1. Acesse: `http://seu-ip:9001`
2. Login: `admin` / `minha_senha`
3. Crie buckets necessários
4. Configure políticas de acesso

## 🔧 Manutenção e Monitoramento

### 📊 Comandos de Monitoramento

```bash
# Verificar status de todos os serviços
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f [nome-do-serviço]

# Verificar uso de recursos
docker stats

# Verificar saúde dos contêineres
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 💾 Backup e Restauração

#### Backup Manual
```powershell
# Backup do PostgreSQL
docker exec postgres_container pg_dump -U usuario banco > backup.sql

# Backup do MinIO (via interface web)
# Acesse http://localhost:9001 e use as ferramentas de backup
```

#### Backup Automatizado
Configure um agendamento no Windows Task Scheduler para executar backups regulares.

#### Backup dos Volumes
```bash
# Backup dos dados do N8N
docker run --rm -v n8n_data:/data -v $(pwd):/backup alpine tar czf /backup/n8n_backup_$(date +%Y%m%d).tar.gz -C /data .

# Backup dos dados do Evolution API
docker run --rm -v evolution_v2_data:/data -v $(pwd):/backup alpine tar czf /backup/evolution_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### 🔄 Atualizações

#### Atualização Segura dos Serviços
```bash
# 1. Fazer backup antes da atualização
./backup.sh

# 2. Parar serviços
docker-compose down

# 3. Atualizar imagens
docker-compose pull

# 4. Reiniciar serviços
docker-compose up -d

# 5. Verificar logs
docker-compose logs -f
```

#### Versões Recomendadas
- **Chatwoot**: v4.6.0 (estável)
- **N8N**: v1.112.5 (LTS)
- **Evolution API**: v2.3.4 (estável)
- **PostgreSQL**: 16 (LTS)
- **Redis**: 8.2 (estável)
- **MinIO**: RELEASE.2025-09-07T16-13-09Z (estável)

## 🚨 Troubleshooting

### Problemas Comuns

#### 🔴 Serviços não iniciam
```bash
# Verificar logs detalhados
docker-compose logs [nome-do-serviço]

# Verificar rede
docker network ls | grep app_network

# Recriar rede se necessário
docker network rm app_network
docker network create app_network
```

#### 🔴 Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
docker ps | grep postgres

# Testar conexão
docker exec -it postgres_chatwoot psql -U postgres -d chatwoot_production -c "SELECT version();"

# Verificar logs do PostgreSQL
docker logs postgres_chatwoot
```

#### 🔴 Problemas de memória
```bash
# Verificar uso de memória
docker stats --no-stream

# Limpar containers parados
docker container prune

# Limpar imagens não utilizadas
docker image prune -a
```

#### 🔴 Evolution API não conecta WhatsApp
1. Verificar se a API key está correta
2. Confirmar que a porta 8080 está acessível
3. Verificar logs: `docker logs evolution_v2`
4. Recriar instância se necessário

### 📞 Logs Importantes

```bash
# Logs específicos por serviço
docker logs chatwoot_app          # Chatwoot
docker logs postgres_chatwoot           # PostgreSQL Chatwoot
docker logs redis_chatwoot           # Redis Chatwoot
docker logs minio_server          # MinIO
docker logs n8n_editor           # N8N
docker logs evolution_v2         # Evolution API
docker logs cloudflared          # Cloudflare Tunnel

# Logs com filtro de tempo
docker logs --since="1h" chatwoot_app
docker logs --tail=100 n8n_editor
```

## 🔒 Segurança

### ⚠️ Configurações Críticas de Segurança

#### 1. Alterar Senhas Padrão
- [ ] PostgreSQL: `minha_senha`
- [ ] MinIO: `admin/minha_senha`
- [ ] Evolution API: `ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f`

#### 2. Configurar Firewall
```bash
# Permitir apenas portas necessárias
ufw allow 3000/tcp  # Chatwoot
ufw allow 5678/tcp  # N8N
ufw allow 8080/tcp  # Evolution API
ufw allow 9001/tcp  # MinIO Console
```

#### 3. SSL/TLS (Produção)
- Configure certificados SSL para todas as interfaces web
- Use Cloudflare Tunnel para acesso externo seguro
- Implemente autenticação de dois fatores

#### 4. Backup Seguro
- Criptografe backups sensíveis
- Armazene backups em local seguro
- Teste restauração regularmente

### 🛡️ Monitoramento de Segurança

```bash
# Verificar portas abertas
netstat -tlnp | grep LISTEN

# Monitorar logs de acesso
tail -f /var/log/nginx/access.log

# Verificar tentativas de login
docker logs chatwoot_app | grep "Failed login"
```

## 📚 Documentação Adicional

Para configuração avançada e uso em produção, consulte:

- **[🔐 Configuração de Segurança](CONFIGURACAO_SEGURANCA.md)** - Checklist completo de segurança e credenciais
- **[🔗 Guia de Integração Chatwoot + Evolution](GUIA_INTEGRACAO_CHATWOOT_EVOLUTION.md)** - Integração completa entre os serviços
- **[📖 Guia de Instalação](INSTALLATION_GUIDE.md)** - Instruções detalhadas de instalação e configuração

## 🧩 Ajustes de Frontend (Axios e Radix Dialog)

- Base URL da Evolution API no frontend: use `http://<SEU_IP>:8080` em vez de `http://localhost:8080` quando o frontend não estiver rodando dentro do mesmo container. Substitua `<SEU_IP>` pelo IP da sua máquina (ex.: `192.168.0.121`).
- Cabeçalho de autenticação: inclua `apikey: evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456` nas requisições.
- Timeout: aumente para `60000ms` se operações demorarem (upload/mídia).
- Conectividade interna (Evolution → Chatwoot): use `http://chatwoot-rails:3000` como `url` na configuração da instância, pois roda na mesma rede Docker.

Exemplo de configuração Axios:

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://<SEU_IP>:8080',
  timeout: 60000,
  headers: {
    apikey: 'evolution_ravenna_2024_api_key_secure_whatsapp_integration_unique_key_456',
    'Content-Type': 'application/json',
  },
});

// Exemplo de chamada para configurar Chatwoot
export async function applyChatwoot(instance = 'chatwoot_principal') {
  const payload = {
    enabled: true,
    accountId: 1,
    token: 'eKWgQ3ZRf15fkspq7Grf3hdN',
    url: 'http://chatwoot-rails:3000',
    signMsg: false,
    reopenConversation: true,
    conversationPending: false,
  };
  return api.post(`/chatwoot/set/${instance}`, payload);
}
```

Correção de acessibilidade Radix Dialog:

```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function MyDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button>Configurar Chatwoot</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title className="DialogTitle">Configuração do Chatwoot</Dialog.Title>
          <Dialog.Description className="DialogDescription">
            Informe os dados da conta para habilitar a integração.
          </Dialog.Description>
          {/* ... conteúdo e ações ... */}
          <Dialog.Close asChild>
            <button aria-label="Fechar">Fechar</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

Referência do componente: https://radix-ui.com/primitives/docs/components/dialog

## 📊 Monitoramento e Gerenciamento

### Portainer - Interface de Gerenciamento
O projeto inclui o **Portainer** para gerenciamento visual e monitoramento dos containers:

- **Interface Web**: Acesse http://192.168.0.121:9002 (substitua pelo IP do servidor)
- **Funcionalidades**:
  - Visualização de todos os containers, volumes e redes
  - Logs centralizados de todos os serviços
  - Monitoramento de recursos (CPU, RAM, rede)
  - Gerenciamento visual de stacks Docker
  - Restart e controle de containers via interface web

## 🛠️ Scripts de Monitoramento

### Script PowerShell para Windows
```powershell
# Verificar status de todos os containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar saúde dos serviços
docker inspect --format='{{.Name}}: {{.State.Health.Status}}' $(docker ps -q)

# Testar conectividade dos serviços
Test-NetConnection -ComputerName localhost -Port 3000  # Chatwoot
Test-NetConnection -ComputerName localhost -Port 5678  # N8N
Test-NetConnection -ComputerName localhost -Port 8080  # Evolution API
Test-NetConnection -ComputerName localhost -Port 9001  # MinIO Console
Test-NetConnection -ComputerName localhost -Port 9000  # Portainer
```

### Comandos de Inicialização Recomendados
```powershell
# Ordem recomendada de inicialização
docker compose up -d minio_server
Start-Sleep -Seconds 10
docker compose up -d postgres_chatwoot redis_chatwoot
Start-Sleep -Seconds 20
docker compose up -d chatwoot-rails chatwoot-sidekiq
docker compose up -d evolution_api
docker compose up -d n8n_editor n8n_webhook n8n_worker
```

## 🌐 URLs de Acesso Rápido

Após a instalação, acesse os serviços através das seguintes URLs (use `192.168.0.121` ou o IP do seu servidor):

| Serviço | URL | Credenciais Padrão |
|---------|-----|-------------------|
| **Chatwoot** | http://192.168.0.121:3000 | Criar conta no primeiro acesso |
| **N8N** | http://192.168.0.121:5678 | Criar conta no primeiro acesso |
| **Evolution API** | http://192.168.0.121:8080 | API Key: `ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f` |
| **MinIO Console** | http://192.168.0.121:9001 | admin / minha_senha |
| **Portainer** | http://192.168.0.121:9002 | Criar conta no primeiro acesso |

## 🎯 Objetivo da Stack

- Unificar atendimento via WhatsApp com automação de processos, armazenamento de mídias e gestão centralizada de serviços.
- Priorizar auto-hospedagem segura em rede local (LAN), com opção de exposição externa via túnel HTTPS sem abrir portas.

## 🧩 Serviços e Vantagens

- Chatwoot — atendimento omnichannel com filas, tags, bots e relatórios; integra com Evolution.
- Evolution API — conectividade robusta com WhatsApp; multi-instância; webhooks e integrações.
- N8N — automação low-code; integrações nativas; escalável com workers para alto volume.
- MinIO — armazenamento compatível com S3; mídias e backups locais; controle de políticas.
- PostgreSQL — banco relacional confiável, transacional (ACID) e simples de manter.
- Redis — cache e filas, melhora performance de consultas e processamento de eventos.
- Portainer — gestão visual de containers, redes e volumes; logs centralizados e métricas.
- Cloudflare Tunnel (opcional) — exposição segura HTTPS sem abrir portas e proteção DDoS.
- aaPanel/Nginx (opcional) — reverse proxy, SSL Let's Encrypt, organização por domínios.
## 📊 Configuração de IP Personalizado

Para alterar o IP padrão (`192.168.1.74`) em todos os arquivos:

```powershell
# Script PowerShell para alteração automática
$oldIP = "192.168.1.74"
$newIP = "SEU_NOVO_IP"  # Substitua pelo IP desejado

# Lista de arquivos para atualizar
$files = @(
    "chatwoot\.env",
    "evolution\.env", 
    "n8n\.env",
    "n8n\n8n.yml",
    "minio\.env",
    "cloudflare\.env"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        (Get-Content $file) -replace $oldIP, $newIP | Set-Content $file
        Write-Host "✅ $file atualizado" -ForegroundColor Green
    }
}
```

## 🔐 Licença e Créditos

### 📋 Licenças dos Componentes

| Componente | Versão | Licença | Repositório |
|------------|--------|---------|-------------|
| **Chatwoot** | v4.6.0 | MIT | [chatwoot/chatwoot](https://github.com/chatwoot/chatwoot) |
| **N8N** | v1.112.5 | Apache 2.0 | [n8n-io/n8n](https://github.com/n8n-io/n8n) |
| **Evolution API** | v2.3.4 | Apache 2.0 | [EvolutionAPI/evolution-api](https://github.com/EvolutionAPI/evolution-api) |
| **PostgreSQL** | 16 | PostgreSQL | [postgres/postgres](https://github.com/postgres/postgres) |
| **Redis** | 8.2 | BSD-3-Clause | [redis/redis](https://github.com/redis/redis) |
| **MinIO** | Latest | AGPL v3 | [minio/minio](https://github.com/minio/minio) |
| **Cloudflare Tunnel** | Latest | Cloudflare | [cloudflare/cloudflared](https://github.com/cloudflare/cloudflared) |

### 🏗️ Projeto Ravenna

Este projeto é uma integração personalizada que combina as melhores ferramentas open-source para criar uma solução completa de comunicação e automação empresarial.

**Desenvolvido por**: Equipe Ravenna  
**Versão**: 1.0.0  
**Data**: 2024  

### 🤝 Contribuições

Contribuições são bem-vindas! Para contribuir:

1. **Fork** este repositório
2. Crie uma **branch** para sua feature (`git checkout -b feature/nova-feature`)
3. **Commit** suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. **Push** para a branch (`git push origin feature/nova-feature`)
5. Abra um **Pull Request**

### 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/ProjetoRavenna/issues)
- **Documentação**: [Wiki do Projeto](https://github.com/seu-usuario/ProjetoRavenna/wiki)
- **Discussões**: [GitHub Discussions](https://github.com/seu-usuario/ProjetoRavenna/discussions)

### 🙏 Agradecimentos

Agradecemos às comunidades e desenvolvedores dos projetos open-source utilizados:
- Chatwoot Team
- N8N Community
- Evolution API Developers
- PostgreSQL Global Development Group
- Redis Team
- MinIO Team
- Cloudflare Team

---

**⭐ Se este projeto foi útil para você, considere dar uma estrela no repositório!**

---

*Última atualização: $(date +"%d/%m/%Y")*