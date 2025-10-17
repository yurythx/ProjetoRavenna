# Solução: Problema de Imagens no Chatwoot

## Problema Identificado
As imagens enviadas no Chatwoot não estão sendo exibidas corretamente. Analisando os logs, identifiquei que o problema está relacionado à configuração de armazenamento.

## Causa Raiz
O Chatwoot estava configurado para usar armazenamento local (`ACTIVE_STORAGE_SERVICE=local`), mas deveria estar usando o MinIO (S3-compatible) para armazenar as imagens.

## Solução Implementada

### 1. Correção da Configuração
Alterado no arquivo `chatwoot/.env`:
```env
# ANTES
ACTIVE_STORAGE_SERVICE=local

# DEPOIS  
ACTIVE_STORAGE_SERVICE=amazon
```

### 2. Verificação das Configurações MinIO
As configurações do MinIO já estavam corretas no Chatwoot:
```env
# Configurações de armazenamento (MinIO)
STORAGE_ACCESS_KEY_ID=RAVENNA8X9Y2Z4A5B6C7D8E9F0G1H2I3J4K5
STORAGE_SECRET_ACCESS_KEY=SecretRavenna2024MinioKey789ABC123DEF456GHI789JKL012MNO345
STORAGE_REGION=us-east-1
STORAGE_BUCKET=chatwoot
STORAGE_ENDPOINT=http://minio:9000
STORAGE_FORCE_PATH_STYLE=true
AWS_REGION=us-east-1
```

## Próximos Passos Necessários

### 1. Reiniciar o Chatwoot
```bash
# Reiniciar apenas o serviço Chatwoot
docker-compose -f chatwoot/chatwoot.yml restart chatwoot-rails
docker-compose -f chatwoot/chatwoot.yml restart chatwoot-sidekiq

# OU reiniciar toda a stack
docker-compose down
docker-compose up -d
```

### 2. Criar o Bucket no MinIO (se necessário)
Acesse o console do MinIO em `http://192.168.0.121:9001` e:
1. Faça login com as credenciais:
   - **Usuário**: `ravenna_admin`
   - **Senha**: `MinioRavenna2024!@#Storage123`
2. Crie um bucket chamado `chatwoot` se não existir
3. Configure as permissões adequadas para o bucket

### 3. Verificar Conectividade
Teste se o Chatwoot consegue acessar o MinIO:
```bash
# Verificar logs do Chatwoot
docker logs chatwoot-rails

# Verificar se o MinIO está acessível
curl -I http://192.168.0.121:9000
```

## Configurações Adicionais para Produção

### 1. Para Deploy com aaPanel
Se usando aaPanel, configure também:
```env
# No arquivo .env do Chatwoot
STORAGE_ENDPOINT=https://minio.seudominio.com
FRONTEND_URL=https://chatwoot.seudominio.com
```

### 2. Configuração de CORS no MinIO
O MinIO pode precisar de configuração CORS para permitir acesso do Chatwoot:
```bash
# Configurar CORS via mc client (dentro do container MinIO)
mc admin config set minio api cors_allow_origin="*"
mc admin service restart minio
```

## Verificação da Solução

### 1. Teste de Upload
1. Acesse o Chatwoot
2. Envie uma imagem em uma conversa
3. Verifique se a imagem é exibida corretamente
4. Verifique se a URL da imagem aponta para o MinIO

### 2. Verificação nos Logs
Os logs devem mostrar URLs como:
```
http://192.168.0.121:9000/chatwoot/[hash]/image.png
```
Em vez de:
```
http://192.168.0.121:3000/rails/active_storage/...
```

## Troubleshooting

### Problema: Bucket não existe
**Solução**: Criar o bucket `chatwoot` no console do MinIO

### Problema: Erro de permissão
**Solução**: Verificar se as credenciais do MinIO estão corretas no Chatwoot

### Problema: Imagens antigas não aparecem
**Solução**: As imagens antigas podem ter sido armazenadas localmente. Considere migração ou aceite que apenas novas imagens funcionarão.

### Problema: CORS
**Solução**: Configurar CORS no MinIO para permitir acesso do domínio do Chatwoot

## Monitoramento

### Logs Importantes
```bash
# Logs do Chatwoot Rails
docker logs -f chatwoot-rails

# Logs do Chatwoot Sidekiq  
docker logs -f chatwoot-sidekiq

# Logs do MinIO
docker logs -f minio_server
```

### Métricas a Acompanhar
- Taxa de sucesso de upload de imagens
- Tempo de carregamento das imagens
- Erros relacionados ao armazenamento nos logs

---

**Nota**: Após implementar essas mudanças, reinicie os serviços e teste o envio de imagens para confirmar que o problema foi resolvido.