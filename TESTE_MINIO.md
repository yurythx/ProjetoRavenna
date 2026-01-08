# 🧪 Guia de Testes do MinIO

Este documento explica como executar os testes do MinIO no ProjetoRavenna.

## 📋 Pré-requisitos

1. **Docker Desktop rodando**
2. **Containers do projeto iniciados**
3. **Variáveis de ambiente configuradas** (arquivo `.env`)

## 🚀 Como Executar os Testes

### Opção 1: Comando Django (Recomendado)

```bash
# Teste básico (verifica configurações e conexão)
docker-compose exec backend python manage.py test_minio

# Teste com verificação de bucket
docker-compose exec backend python manage.py test_minio --check-bucket

# Teste completo (inclui upload)
docker-compose exec backend python manage.py test_minio --check-bucket --test-upload

# Modo verbose (mostra detalhes)
docker-compose exec backend python manage.py test_minio --verbose
```

### Opção 2: Script de Diagnóstico Completo

```bash
# No servidor Linux
./diagnose_minio.sh

# Ou localmente (se Docker estiver rodando)
chmod +x diagnose_minio.sh
./diagnose_minio.sh
```

### Opção 3: Script de Teste Local

```bash
# Windows (PowerShell)
# Primeiro, inicie o Docker Desktop
# Depois execute:
bash test_minio_local.sh

# Linux/Mac
chmod +x test_minio_local.sh
./test_minio_local.sh
```

## 📊 O que os Testes Verificam

### Teste Básico (`test_minio`)
- ✅ Se MinIO está habilitado (`USE_MINIO=True`)
- ✅ Se todas as configurações estão presentes
- ✅ Se a conexão com MinIO funciona

### Teste com Bucket (`--check-bucket`)
- ✅ Se o bucket existe
- ✅ Se tem permissões de leitura
- ✅ Se tem permissões de escrita

### Teste com Upload (`--test-upload`)
- ✅ Se consegue fazer upload de arquivo
- ✅ Se a URL gerada está correta
- ✅ Se a URL usa o domínio customizado (se configurado)

## 🔍 Interpretando os Resultados

### ✅ Sucesso
```
✅ MinIO está habilitado
✅ Todas as configurações estão presentes
✅ Conexão com MinIO estabelecida com sucesso
✅ Bucket "projetoravenna" existe
✅ Permissões de leitura OK
✅ Permissões de escrita OK
✅ Arquivo salvo: test/minio_test.txt
✅ URL gerada: https://minio.projetoravenna.cloud/projetoravenna/test/minio_test.txt
✅ URL usa o domínio customizado corretamente
```

### ❌ Erros Comuns

#### Erro: "MinIO não está habilitado"
**Solução**: Configure `USE_MINIO=True` no `.env` ou `docker-compose.yml`

#### Erro: "Configurações faltando"
**Solução**: Verifique se todas as variáveis `MINIO_*` estão no `.env`

#### Erro: "Credenciais não encontradas"
**Solução**: Configure `MINIO_ACCESS_KEY` e `MINIO_SECRET_KEY` no `.env`

#### Erro: "Bucket não existe"
**Solução**: Execute:
```bash
docker-compose exec minio mc mb myminio/projetoravenna
docker-compose exec minio mc anonymous set download myminio/projetoravenna
```

#### Erro: "Sem permissão para escrever no bucket"
**Solução**: Configure permissões públicas:
```bash
docker-compose exec minio mc anonymous set download myminio/projetoravenna
```

#### Erro: "URL não contém o domínio esperado"
**Solução**: Configure `MINIO_PUBLIC_DOMAIN` no `.env`

## 🐛 Troubleshooting

### Docker não está rodando
```bash
# Windows: Inicie o Docker Desktop
# Linux: sudo systemctl start docker
```

### Containers não estão rodando
```bash
docker-compose up -d
```

### Erro de permissão
```bash
# No Linux, pode precisar de sudo
sudo docker-compose exec backend python manage.py test_minio
```

### Ver logs para mais detalhes
```bash
docker-compose logs backend
docker-compose logs minio
```

## 📝 Checklist de Teste

Antes de executar os testes, verifique:

- [ ] Docker Desktop está rodando
- [ ] Containers estão iniciados (`docker-compose ps`)
- [ ] Arquivo `.env` existe e está configurado
- [ ] Variáveis `MINIO_ROOT_USER` e `MINIO_ROOT_PASSWORD` estão definidas
- [ ] `MINIO_BUCKET_NAME` está definido (padrão: `projetoravenna`)
- [ ] `MINIO_PUBLIC_DOMAIN` está definido (se usando domínio customizado)

## 🎯 Próximos Passos Após Testes

Se todos os testes passarem:

1. ✅ MinIO está configurado corretamente
2. ✅ Pode fazer upload de arquivos
3. ✅ URLs serão geradas corretamente
4. ✅ Imagens devem carregar no frontend

Se algum teste falhar:

1. Consulte a seção "Erros Comuns" acima
2. Execute o script de diagnóstico: `./diagnose_minio.sh`
3. Verifique os logs: `docker-compose logs minio`
4. Consulte a documentação: `docs/MINIO_SETUP.md`

## 📚 Referências

- [Documentação MinIO](docs/MINIO_SETUP.md)
- [Comandos Docker](docs/COMMANDS.md)
- [Guia de Deploy](QUICKSTART.md)
