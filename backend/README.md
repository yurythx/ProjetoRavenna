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
