# Architecture Documentation

## 1. Design Principles (SOLID)

This codebase enforces strict separation of concerns:

- **Models (`models.py`)**: strictly define database schema and relationships. Minimal logic (only property methods or `__str__`).
- **Services (`services.py`)**: The **ONLY** place where data mutation (CREATE, UPDATE, DELETE) happens.
  - Ensures business rules are enforced before database commits.
  - Uses `transaction.atomic()` to ensure data integrity.
- **Selectors (`selectors.py`)**: The place for data retrieval.
  - Keeps complex queries out of Views and Serializers.
  - Can return simple QuerySets, Lists, or Dictionaries.
- **Views (`views.py` / `api.py`)**: The HTTP interface layer.
  - Parses requests.
  - Calls Selectors to get data OR Services to change data.
  - Serializes the result.
  - Handles HTTP status codes.
- **Serializers (`serializers.py`)**: Data transformation (JSON <-> Objects) and basic field validation (types, max_length).

## 2. The "Plug & Play" Module System

To support a SaaS structure where features can be toggled per tenant or globally, we use a middleware-based approach.

### Components:
1.  **`AppModule` Model** (in `apps.core`):
    - Stores metadata about modules (`slug`, `is_active`, configuration).
2.  **`ModuleMiddleware`**:
    - Intercepts every request to `/api/v1/<module_slug>/*`.
    - Checks if `AppModule` exists for `<module_slug>`.
    - If found and `is_active=False`, returns `403 Forbidden`.
    - Efficient: Can be optimized with Caching (Redis) to avoid DB hits on every request.

## 3. Generic Entities

We avoid duplicating "Name", "Address", "Phone" tables for Clients, Suppliers, Partners.
- **`apps.entities.Entity`**: Central table for all people/organizations.
- **`apps.entities.Address`**: Uses **Generic Foreign Keys** to attach addresses to ANY other model in the system (Entity, User, Warehouse, etc.) without hardcoding keys.

## 4. API Standards

- **Endpoint Structure**: `/api/v1/<module_slug>/<resource>/`
- **Response Format**:
  - Success (2xx): Returns requested data directly.
  - Error (4xx/5xx):
    ```json
    {
      "code": "error_code",
      "message": "Human readable message",
      "details": { ... }
    }
    ```
