# Blog App - Documentação Técnica

## Visão Geral

O app `blog` é responsável pela gestão de notícias, posts e conteúdo editorial do **Projeto Ravenna**.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                          BLOG APP                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Views     │───▶│  Services   │───▶│   Models    │        │
│  │  (ViewSet) │    │  (CRUD)    │    │  (Dados)    │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐                             │
│  │Serializers │    │Permissions  │                             │
│  │  (DRF)    │    │ (BlogEdit) │                             │
│  └─────────────┘    └─────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Modelos

### Category

```python
class Category(UUIDModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
```

### Tag

```python
class Tag(UUIDModel):
    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)
```

### Post

```python
class Post(UUIDModel):
    class Status(models.TextChoices):
        DRAFT = "draft"
        PUBLISHED = "published"
        ARCHIVED = "archived"

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    excerpt = models.TextField(max_length=500)
    content = models.TextField()

    author = ForeignKey("accounts.User")
    category = ForeignKey("Category", null=True)
    tags = ManyToManyField("Tag")

    status = CharField(choices=Status.choices)
    is_featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True)

    view_count = models.IntegerField(default=0)
    read_time_minutes = property  # Calculado: words // 200
```

## Workflow de Publicação

```
┌──────────────────────────────────────────────────────────────┐
│                  POST LIFECYCLE                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   DRAFT ──────▶ PUBLISHED ──────▶ ARCHIVED                  │
│      │              │                  │                    │
│      │              │                  │                    │
│      ▼              ▼                  ▼                    │
│   (rascunho)   (visível)         (oculto)                   │
│                                                               │
│   publish()     unpublish()       archive()                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Services

### PostService

```python
PostService.create_post(...)      # Criar post
PostService.update_post(...)      # Atualizar post
PostService.publish_post(post)    # Publicar
PostService.archive_post(post)     # Arquivar
PostService.get_published_posts()  # Listar publicados
PostService.get_post_by_slug()    # Buscar por slug
PostService.get_featured_posts()   # Posts em destaque
```

## APIs Endpoints

### Posts

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| GET | `/api/blog/posts/` | Todos | Listar posts publicados |
| GET | `/api/blog/posts/{slug}/` | Todos | Ver post |
| POST | `/api/blog/posts/` | Autenticado | Criar post |
| PUT | `/api/blog/posts/{slug}/` | Blog Editor | Atualizar |
| DELETE | `/api/blog/posts/{slug}/` | Blog Editor | Deletar |
| GET | `/api/blog/posts/featured/` | Todos | Posts em destaque |
| GET | `/api/blog/posts/by_category/?slug=x` | Todos | Por categoria |
| GET | `/api/blog/posts/by_tag/?slug=x` | Todos | Por tag |
| GET | `/api/blog/posts/search/?q=x` | Todos | Buscar |
| POST | `/api/blog/posts/{slug}/publish/` | Blog Editor | Publicar |
| POST | `/api/blog/posts/{slug}/archive/` | Blog Editor | Arquivar |

### Categorias

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| GET | `/api/blog/categories/` | Todos | Listar |
| POST | `/api/blog/categories/` | Blog Editor | Criar |
| PUT | `/api/blog/categories/{slug}/` | Blog Editor | Atualizar |
| DELETE | `/api/blog/categories/{slug}/` | Blog Editor | Deletar |

### Tags

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| GET | `/api/blog/tags/` | Todos | Listar todas |
| GET | `/api/blog/tags/{slug}/` | Todos | Ver tag |

## Permissões

| Permissão | Descrição |
|-----------|-----------|
| `IsBlogEditor` | Blog editors e admins podem criar/editar |
| `AllowAny` | Listagem e leitura são públicas |

## SEO

Posts suportam campos meta para SEO:
- `meta_title`: Título para搜索引擎 (max 70 chars)
- `meta_description`: Descrição (max 160 chars)

## ISR (Next.js)

O blog é otimizado para **Incremental Static Regeneration**:
- `GET /api/blog/posts/` retorna apenas posts publicados
- Slugs são únicos e estáveis
- Dados de categorias e tags disponíveis para build-time

## Boas Práticas

1. **ViewCount**: Incrementado automaticamente ao ver post
2. **ReadTime**: Calculado automaticamente (200 words/min)
3. **Tags**: Criadas automaticamente se não existirem
4. **Draft/Publish**: Workflow completo de publicação
