# Backend - Modular ERP API

This project is an API-First Backend for a Modular ERP/SaaS system, built with Django & Django Rest Framework, following SOLID principles and a Layered Architecture.

## 🚀 Tech Stack

- **Django 5.0+**
- **Django Rest Framework** (API)
- **DRF Spectacular** (OpenAPI 3 / Swagger Documentation)
- **SimpleJWT** (Authentication)
- **PostgreSQL** (Recommended for production, SQLite for dev)
- **Python Decouple** (Environment variables)

## 🏗 Architecture

The project follows a **Layered Architecture** to ensure modularity and ease of maintenance.

- **Apps (`apps/`)**:
  - **`core`**: Base abstractions (`BaseUUIDModel`, `SlugMixin`), Module Management, and Middleware.
  - **`accounts`**: Custom User (Email login), Auth.
  - **`entities`**: shared registry (Entities, Addresses).
  - **`articles`**: Example pluggable module.

- **Patterns**:
  - **Service Layer (`services.py`)**: Handles all write operations (business logic, validation, transactional saves).
  - **Selector Layer (`selectors.py`)**: Handles complex read operations/queries.
  - **Module System**: Dynamic module activation/deactivation via `AppModule` model and Middleware.

## 🛠 Setup & Running

1. **Create Virtual Environment & Install Dependencies**:
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Create a `.env` file in the `backend/` root (next to `manage.py`):
   ```ini
   SECRET_KEY=your-secret-key
   DEBUG=True
   ALLOWED_HOSTS=*
   # DATABASE_URL=postgres://... (Optional for local dev with SQLite)
   ```

3. **Migrate Database**:
   ```bash
   python manage.py migrate
   ```

4. **Create Superuser**:
   ```bash
   python manage.py createsuperuser
   ```

5. **Run Server**:
   ```bash
   python manage.py runserver
   ```

## 📚 Documentation via Swagger

Once the server is running, access:
- **Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **OpenAPI Schema**: [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

## 🧩 Module Management

Logic for enabling/disabling modules is handled by `ModuleMiddleware`.
1. Go to Admin (`/admin/`).
2. Navigate to **Core > App Modules**.
3. Create an entry, e.g., `Name: Articles`, `Slug: articles`, `Active: Checked`.
   - If `Active` is unchecked, requests to `/api/v1/articles/` will return `403 Forbidden`.

## 🗨️ Comments (Users and Guests)

The Articles module supports comments from authenticated users and guests.

### Guest Comments
- Guests must provide `guest_name`, `guest_email`, `guest_phone`.
- Content is sanitized (HTML removed) server-side.
- Honeypot (`hp`) write-only field is used to deter bots.
- Rate limit for guests: one comment per IP every 30 seconds.
- Guest comments are created as `is_approved = false` and require moderation.

### Moderation
- Admin can approve/unapprove comments via Django Admin list actions.
- API endpoint to approve a single comment:
  - `POST /api/v1/articles/comments/{id}/approve/` (admin only)
  - Returns `{ status: "approved" }`
- Notifications are sent:
  - For approved comments only
  - Reply notifications go to parent comment author
  - New comment notifications go to article author

### API Endpoints
- List comments: `GET /api/v1/articles/comments/?article={article_id}&parent_only=true`
- Create comment (user or guest): `POST /api/v1/articles/comments/`
  - Body (user): `{ "article": "<uuid>", "content": "..." }`
  - Body (guest): `{ "article": "<uuid>", "content": "...", "guest_name": "...", "guest_email": "...", "guest_phone": "...", "hp": "", "captcha": "<token>" }`
- Delete comment (author or staff): `DELETE /api/v1/articles/comments/{id}/`

## 🔐 CAPTCHA Validation (Guests)

To block automated submissions, guest comments require a valid CAPTCHA token.

### Backend Configuration
Set environment variables in `backend/.env`:
```
CAPTCHA_PROVIDER=hcaptcha    # or 'recaptcha'
CAPTCHA_SECRET=your-secret
```

Supported providers:
- `hcaptcha`: Verifies via `https://hcaptcha.com/siteverify`
- `recaptcha`: Verifies via `https://www.google.com/recaptcha/api/siteverify`

The backend validates `captcha` token from the request and rejects invalid submissions.

## 🔔 Notifications

System notifications are generated for:
- New comment on article (to article author)
- Reply to a comment (to parent comment author)

Notes:
- Guest comments trigger notifications only after approval.
- Notifications are created after the database transaction commits to ensure consistency.
