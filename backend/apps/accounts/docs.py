# Accounts App - Documentação Técnica

## Visão Geral

O app `accounts` é responsável por toda a gestão de usuários, autenticação e autorização no **Projeto Ravenna**.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        ACCOUNTS APP                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Views     │───▶│  Services   │───▶│   Models    │        │
│  │  (API)      │    │  (Lógica)   │    │  (Dados)    │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                  │                                   │
│         ▼                  ▼                                   │
│  ┌─────────────┐    ┌─────────────┐                            │
│  │ Serializers │    │ Validators  │                            │
│  │  (DRF)     │    │ (Regras)    │                            │
│  └─────────────┘    └─────────────┘                            │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐                            │
│  │Permissions  │    │  Signals    │                            │
│  │  (DRF)     │    │ (Auto-Ação)│                            │
│  └─────────────┘    └─────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Modelos

### User

```python
class User(AbstractUser):
    id = models.UUIDField(primary_key=True)        # UUID como PK
    uuid = models.UUIDField(unique=True)           # UUID público
    email = models.EmailField(unique=True)        # Login via email
    display_name = models.CharField(max_length=100)
    birth_date = models.DateField(null=True)
    gender = models.CharField(choices=Gender.choices)

    # Status
    is_banned = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    # Seguridad
    hwid = models.CharField(max_length=255)      # Hardware ID
    last_login_ip = models.GenericIPAddressField()

    # Ban
    ban_reason = models.TextField()
    banned_at = models.DateTimeField()
    banned_by = ForeignKey("self")

    # Token
    verification_token = models.CharField()
    verification_token_created_at = models.DateTimeField()
    last_password_change = models.DateTimeField()
```

### Properties Úteis

```python
user.is_active_and_not_banned   # Verifica se pode fazer login
user.is_player                 # Pertence ao grupo "players"?
user.is_blog_editor             # Pertence ao grupo "blog_editors"?
user.is_forum_moderator         # Pertence ao grupo "forum_moderators"?
user.is_admin                  # É staff ou superuser?
```

## Grupos de Usuários

| Grupo | Permissões | Descrição |
|-------|------------|-----------|
| `players` | `can_play`, `can_trade` | Usuários normais do jogo |
| `blog_editors` | `can_create_post`, `can_edit_own_post`, `can_publish_post` | Editores de blog |
| `forum_moderators` | `can_moderate_posts`, `can_ban_users`, `can_pin_topics`, `can_delete_topics` | Moderadores |
| `admins` | Todas | Administradores do sistema |

**Nota**: Superusers automaticamente têm todas as permissões.

## Services

### UserRegistrationService

```python
UserRegistrationService.register_user(
    email="user@example.com",
    username="username",
    password="SecurePass123!",
    display_name="User Name",
    birth_date=date(2000, 1, 1),
    registration_ip="192.168.1.1",
    hwid="HWID-123"
)
```

**Comportamento:**
- Valida email, username, password
- Cria usuário com password hasheado
- Adiciona automaticamente ao grupo `players`
- Gera `verification_token` para email verification
- Envia email de boas-vindas (se configurado)

### UserAuthenticationService

```python
user = UserAuthenticationService.authenticate(
    email="user@example.com",
    password="SecurePass123!",
    hwid="HWID-123",        # Opcional
    ip_address="192.168.1.1"
)
```

**Comportamento:**
- Verifica credenciais
- Confere HWID se fornecido
- Atualiza `last_login_ip`
- Retorna `None` se falhar

### UserManagementService

```python
# Banir usuário
UserManagementService.ban_user(user, reason="Spam", banned_by=admin)

# Desbanir
UserManagementService.unban_user(user, unbanned_by=admin)

# Reset password (admin)
UserManagementService.reset_password(user, "NewPass123!", reset_by=admin)

# Alterar grupos
UserManagementService.change_user_groups(user, ["players", "blog_editors"], modified_by=superuser)
```

### UserProfileService

```python
# Obter perfil
profile = UserProfileService.get_profile(user)

# Atualizar próprio perfil
UserProfileService.update_own_profile(user, {"display_name": "New Name"})

# Alterar senha
UserProfileService.change_own_password(user, "CurrentPass", "NewPass123!")
```

## APIs Endpoints

### Autenticação

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| POST | `/api/accounts/register/` | Todos | Registrar novo usuário |
| POST | `/api/accounts/login/` | Todos | Login (retorna JWT) |
| POST | `/api/accounts/logout/` | Autenticado | Logout (blacklist token) |
| POST | `/api/accounts/token/refresh/` | Todos | Refresh JWT |
| POST | `/api/accounts/token/verify/` | Todos | Verificar token |

### Perfil

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| GET | `/api/accounts/profile/` | Autenticado | Ver próprio perfil |
| PUT | `/api/accounts/profile/` | Autenticado | Atualizar próprio perfil |
| POST | `/api/accounts/change-password/` | Autenticado | Alterar senha |

### Reset de Senha

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| POST | `/api/accounts/password-reset/` | Todos | Solicitar reset |
| POST | `/api/accounts/password-reset/confirm/` | Todos | Confirmar com token |

### Admin

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| GET | `/api/accounts/users/` | Admin | Listar usuários |
| GET | `/api/accounts/users/{id}/` | Admin | Ver usuário |
| PUT | `/api/accounts/users/{id}/` | Admin | Atualizar usuário |
| DELETE | `/api/accounts/users/{id}/` | Admin | Deletar usuário |
| POST | `/api/accounts/users/{id}/ban/` | Admin/Moderator | Banir usuário |
| POST | `/api/accounts/users/{id}/unban/` | Admin | Desbanir |
| POST | `/api/accounts/users/{id}/reset-password/` | Admin | Reset senha |
| POST | `/api/accounts/users/{id}/activate/` | Admin | Ativar |
| POST | `/api/accounts/users/{id}/deactivate/` | Admin | Desativar |
| GET | `/api/accounts/users/search/?q=query` | Admin | Buscar usuários |
| GET | `/api/accounts/users/banned/` | Admin | Listar banidos |

## Validações

### Senha

- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula
- Pelo menos 1 dígito
- Não pode ser senha comum (password, 12345678, etc.)

### Username

- 3-30 caracteres
- Apenas letras, números, underscore e hífen
- Deve ser único

### Birth Date

- Idade mínima: 13 anos
- Não pode ser no futuro

## Signals

### post_migrate

Ao executar `migrate` no app `accounts`, automaticamente cria:
- Grupo `players`
- Grupo `blog_editors`
- Grupo `forum_moderators`
- Grupo `admins` (com todas as permissões)

## Fluxo de Autenticação JWT

```
1. Registro
   POST /api/accounts/register/
   → Cria usuário
   → Retorna JWT tokens

2. Login
   POST /api/accounts/login/
   → Valida credenciais
   → Retorna JWT tokens

3. Usar token
   Authorization: Bearer <access_token>

4. Refresh
   POST /api/accounts/token/refresh/
   → Envia refresh_token
   → Retorna novo access_token
```

## Permissões DRF

```python
IsAuthenticated           # Qualquer usuário logado
IsAdmin                    # Staff ou Superuser
IsSuperUser               # Apenas Superuser
IsPlayer                  # Grupo players
IsBlogEditor              # Grupo blog_editors
IsForumModerator          # Grupo forum_moderators
IsOwnerOrAdmin            # Dono do objeto ou Admin
```

## Testes

Executar testes:
```bash
python manage.py test apps.accounts.tests
```

Cobertura:
- `test_models.py` - 9 testes (User model)
- `test_services.py` - 15 testes (Services)
- `test_serializers.py` - 6 testes (Serializers)

**Total: 34 testes**

## Boas Práticas Implementadas

1. **Service Layer**: Toda lógica de negócio em `services.py`
2. **Validators**: Validações reutilizáveis em `validators.py`
3. **UUID como PK**: Facilita sincronização com Unity
4. **Transaction.atomic**: Operações atômicas nos services
5. **Permissões granulares**: Cada grupo tem permissões específicas
6. **Serializer separation**: Leve, sem `depth=1`
7. **Tests**: 100% coverage nas operações principais
