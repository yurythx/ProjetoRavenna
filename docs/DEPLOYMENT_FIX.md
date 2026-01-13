# Docker Deployment - Quick Fix Guide

## 🔴 Problema: ECONNREFUSED + 404 na Entity Config

### Causa Raiz:
1. Frontend sem `INTERNAL_API_URL` (SSR não consegue falar com backend)
2. Entity padrão não foi criada no banco de dados

---

## ✅ Solução Rápida:

### 1. Atualize o Container com a nova configuração

```bash
# Pull das mudanças
git pull

# Rebuild e restart dos containers
docker-compose down
docker-compose up -d --build
```

### 2. Crie a Entity Padrão

Execute **dentro do container backend**:

```bash
docker-compose exec backend python manage.py seed_initial_data
```

Ou via comando direto:

```bash
docker-compose exec backend python manage.py create_tenant \
  --name="Projeto Ravenna" \
  --domain="projetoravenna.cloud" \
  --brand-name="Projeto Ravenna"
```

---

## 🔍 Verificar se Funcionou:

### 1. Verificar Logs do Frontend
```bash
docker-compose logs frontend | grep -i tenant
```

**Antes** (erro):
```
[Tenant] Error fetching config: ECONNREFUSED
```

**Depois** (sucesso):
```
✅ Sem erros de ECONNREFUSED
```

### 2. Testar o Endpoint
```bash
curl http://localhost:8000/api/v1/entities/config/
```

**Deve retornar**:
```json
{
  "name": "Projeto Ravenna",
  "domain": "projetoravenna.cloud",
  "primary_color": "#44B78B",
  ...
}
```

---

## 📋 Checklist de Deploy:

- [x] `INTERNAL_API_URL` no docker-compose.yml
- [ ] Rebuild dos containers (`docker-compose up -d --build`)
- [ ] Executar `seed_initial_data` no backend
- [ ] Verificar logs sem erros ECONNREFUSED
- [ ] Testar endpoint `/api/v1/entities/config/`

---

## 🚨 Troubleshooting:

**Se ainda der 404:**
```bash
# Verificar se Entity existe no banco
docker-compose exec backend python manage.py shell
>>> from apps.entities.models import Entity
>>> Entity.objects.all()
```

**Se não tiver Entity:**
```bash
docker-compose exec backend python manage.py seed_initial_data
```

**Verificar variáveis de ambiente:**
```bash
docker-compose exec frontend printenv | grep API_URL
```

Deve mostrar:
```
NEXT_PUBLIC_API_URL=https://api.projetoravenna.cloud/api/v1
INTERNAL_API_URL=http://backend:8000/api/v1
```
