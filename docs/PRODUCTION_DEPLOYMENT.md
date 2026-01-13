# Production Deployment Guide

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose installed
- Domain configured (e.g., `projetoravenna.cloud`)
- SSL certificates (via Cloudflare/Let's Encrypt)

### 1. Clone Repository

```bash
git clone https://github.com/yurythx/ProjetoRavenna.git
cd ProjetoRavenna
```

### 2. Configure Environment

Create `.env` file in project root:

```bash
# Entity Configuration
DEFAULT_ENTITY_DOMAIN=projetoravenna.cloud

# Superuser Credentials
SUPERUSER_NAME=suporte
SUPERUSER_PASSWORD=suporte123
SUPERUSER_EMAIL=suporte@projetoravenna.cloud

# Database
DATABASE_URL=postgres://postgres:postgres@db:5432/projetoravenna

# Redis
REDIS_URL=redis://redis:6379/1

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud
```

### 3. Deploy Containers

```bash
docker-compose up -d --build
```

**Expected Output:**
```
✔ Container projetoravenna-db-1       Healthy
✔ Container projetoravenna-redis-1    Healthy
✔ Container projetoravenna-minio-1    Healthy
✔ Container projetoravenna-backend-1  Started
✔ Container projetoravenna-frontend-1 Started
```

### 4. Initialize Database

```bash
docker-compose exec backend python manage.py seed_initial_data
```

**Expected Output:**
```
Starting data seeding...
Superuser 'suporte' created.
✅ Default Entity created: Projeto Ravenna (projetoravenna.cloud)
Category 'Tecnologia' created.
...
Seeding completed successfully!
```

### 5. Verify Deployment

```bash
# Test backend health
curl http://localhost:8000/health/

# Test entity config
curl http://localhost:8000/api/v1/entities/config/

# Check logs
docker-compose logs -f
```

---

## 🔧 Configuration Details

### Frontend Environment Variables

```yaml
# docker-compose.yml
frontend:
  environment:
    # Public URL for browser requests
    - NEXT_PUBLIC_API_URL=https://api.projetoravenna.cloud/api/v1
    
    # Internal URL for SSR (container-to-container)
    - INTERNAL_API_URL=http://backend:8000/api/v1
    
    - NODE_ENV=production
    - PORT=3001
```

**Critical:**
- `NEXT_PUBLIC_API_URL`: Used by browser JavaScript
- `INTERNAL_API_URL`: Used by Next.js server for SSR

### Backend Environment Variables

```yaml
backend:
  environment:
    # Database connection
    - DATABASE_URL=postgres://postgres:postgres@db:5432/projetoravenna
    
    # Cache backend
    - REDIS_URL=redis://redis:6379/1
    
    # Storage - internal endpoint (Docker network)
    - MINIO_ENDPOINT_URL=http://minio:9000
    
    # Storage - public URL (for browser downloads)
    - MINIO_PUBLIC_DOMAIN=minio.projetoravenna.cloud
    
    # Default tenant domain
    - DEFAULT_ENTITY_DOMAIN=projetoravenna.cloud
```

---

## 🐛 Troubleshooting

### Problem 1: ECONNREFUSED Errors

**Symptoms:**
```
[Tenant] Error fetching config: ECONNREFUSED
```

**Cause:** Frontend can't reach backend via Docker network

**Solution:**

Add to `docker-compose.yml`:
```yaml
frontend:
  environment:
    - INTERNAL_API_URL=http://backend:8000/api/v1
```

Then rebuild:
```bash
docker-compose down
docker-compose up -d --build
```

---

### Problem 2: 404 on Entity Config

**Symptoms:**
```
GET /api/v1/entities/config/ HTTP/1.1" 404
```

**Diagnosis:**
```bash
# Test from inside backend container
docker-compose exec backend curl http://localhost:8000/api/v1/entities/config/

# If returns 200 but browser gets 404:
# => Entity exists but domain doesn't match request Host header
```

**Solution A: Update Entity Domain**

```bash
docker-compose exec backend python manage.py shell
```

```python
from apps.entities.models import Entity

entity = Entity.objects.first()
entity.domain = 'projetoravenna.cloud'  # Your production domain
entity.brand_name = 'Projeto Ravenna'
entity.save()

print(f"✅ Updated: {entity.name} ({entity.domain})")
exit()
```

**Solution B: Set DEFAULT_ENTITY_DOMAIN**

Add to `.env`:
```bash
DEFAULT_ENTITY_DOMAIN=projetoravenna.cloud
```

Then re-run:
```bash
docker-compose down
docker-compose up -d --build
docker-compose exec backend python manage.py seed_initial_data
```

---

### Problem 3: Recharts Dimension Errors

**Symptoms:**
```
The width(-1) and height(-1) of chart should be greater than 0
```

**Cause:** Chart rendering before container has dimensions

**Solution:**

Already fixed in latest code. If you see this, pull latest:
```bash
git pull origin main
docker-compose up -d --build frontend
```

---

### Problem 4: MinIO Connection Issues

**Symptoms:**
```
Connection refused to minio:9000
```

**Solution:**

Check MinIO is healthy:
```bash
docker-compose ps minio
# Should show "healthy"

# Check MinIO logs
docker-compose logs minio

# Restart if needed
docker-compose restart minio
```

---

## 📊 Monitoring

### Check Container Health

```bash
docker-compose ps
```

All services should show "Up" and "healthy".

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Check Database

```bash
docker-compose exec backend python manage.py dbshell
```

```sql
-- Check entities
SELECT id, name, domain, brand_name FROM entities_entity;

-- Check users
SELECT username, email, is_staff, is_active FROM accounts_customuser;
```

---

## 🔄 Updates & Maintenance

### Pull Latest Changes

```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Database Migrations

```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

### Collect Static Files

```bash
docker-compose exec backend python manage.py collectstatic --noinput
```

### Backup Database

```bash
docker-compose exec db pg_dump -U postgres projetoravenna > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
docker-compose exec -T db psql -U postgres projetoravenna < backup_20260113.sql
```

---

## 🔐 Security Checklist

- [ ] Change default superuser password
- [ ] Set strong `SECRET_KEY` in Django
- [ ] Configure CORS allowed origins
- [ ] Enable SSL/TLS (HTTPS)
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Backup strategy in place

---

## 📈 Performance Tips

### Enable Redis Caching

Already configured in `settings.py`:
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

### Optimize Database Queries

```bash
# Enable query logging in dev
docker-compose exec backend python manage.py shell
```

```python
from django.db import connection
from django.test.utils import override_settings

with override_settings(DEBUG=True):
    # Your queries here
    print(connection.queries)
```

### Monitor Cache Hit Rate

```bash
docker-compose exec redis redis-cli INFO STATS
```

---

## 📞 Support

### Common Commands

```bash
# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# View resource usage
docker stats

# Clean up unused resources
docker system prune -a
```

### Debug Shell Access

```bash
# Backend Django shell
docker-compose exec backend python manage.py shell

# Database shell
docker-compose exec backend python manage.py dbshell

# Container bash
docker-compose exec backend bash
docker-compose exec frontend sh
```

---

## ✅ Deployment Checklist

Pre-deployment:
- [ ] `.env` file configured
- [ ] Domain DNS pointing to server
- [ ] SSL certificates ready
- [ ] Docker & Docker Compose installed

Deployment:
- [ ] `git pull` latest code
- [ ] `docker-compose up -d --build`
- [ ] `seed_initial_data` executed
- [ ] Entity domain configured
- [ ] All containers healthy

Post-deployment:
- [ ] Test `/api/v1/entities/config/` returns 200
- [ ] Test admin login works
- [ ] Test all admin pages load
- [ ] No errors in logs
- [ ] Monitoring set up

---

## 🎓 Key Learnings

1. **INTERNAL_API_URL is critical** for Next.js SSR in Docker
2. **Entity domain must match** the request Host header
3. **Rebuild containers** after docker-compose.yml changes
4. **Use explicit heights** for Recharts components
5. **Seed data early** to avoid 404 errors

---

## 📚 Additional Resources

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [MinIO Deployment Guide](https://min.io/docs/minio/linux/operations/installation.html)
