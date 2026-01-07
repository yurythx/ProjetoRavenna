# Documentação Backend (Django API)

## 🚀 Tech Stack

- **Framework**: Django 5.x + Django Rest Framework (DRF)
- **Database**: PostgreSQL (Driver: psycopg2-binary)
- **Auth**: SimpleJWT (JWT Authentication)
- **Docs**: DRF Spectacular (OpenAPI 3.0)
- **Storage**: MinIO / S3 (via django-storages)
- **Task Queue**: Celery + Redis (Opcional/Futuro)

## 📚 Guias Disponíveis

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Explicação detalhada da Clean Architecture, Camadas (Services/Selectors) e organização do código.
- **[FEATURES.md](FEATURES.md)**: Detalhes de funcionalidades específicas como Comentários, CAPTCHA, Moderação e Notificações.
- **[DJANGO_ADMIN_README.md](DJANGO_ADMIN_README.md)**: Guia de personalização do Django Admin (Unfold Theme).

## 🏗 Estrutura do Projeto

```
backend/
├── config/              # Settings, URLs, WSGI
├── apps/                # Aplicações Django (Módulos)
│   ├── core/            # Abstrações, Base Models, Middleware
│   ├── accounts/        # Custom User, Auth
│   ├── articles/        # [Módulo] Blog e Conteúdo
│   └── entities/        # [Módulo] Clientes, Endereços
│
├── .env                 # Variáveis de ambiente (Segredo!)
└── manage.py            # CLI Tool
```

## 🔌 API Endpoints Principais

A documentação interativa completa (Swagger) está disponível em `/api/docs/` quando o servidor está rodando.

- `/api/v1/auth/` - Token, Refresh, User Profile
- `/api/v1/artigos/` - CRUD de Artigos, Categorias
- `/api/v1/artigos/comments/` - Comentários

## 🧪 Testes

```bash
# Rodar todos os testes
python manage.py test

# Rodar testes de um app específico
python manage.py test apps.articles
```
