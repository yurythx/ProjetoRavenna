# Multi-tenant System - Entity Management Guide

## Quick Start: Create a New Tenant

Use the Django management command to quickly create a new tenant:

```bash
python manage.py create_tenant \
  --name="My Business" \
  --domain="localhost" \
  --brand-name="My Business Platform" \
  --primary-color="#FF5733" \
  --secondary-color="#1A1A1A" \
  --footer-text="All rights reserved."
```

### Arguments:
- `--name` (required): Internal entity name
- `--domain` (required): Domain/subdomain for this tenant
- `--brand-name` (optional): Public brand name (defaults to --name)
- `--primary-color` (optional): Primary theme color (default: #44B78B)
- `--secondary-color` (optional): Secondary theme color (default: #2D3748)
- `--footer-text` (optional): Custom footer text

## Managing Entities via Django Admin

1. Access `/admin/entities/entity/`
2. All branding fields are now available:
   - Domain
   - Brand Name
   - Colors (Primary/Secondary)
   - Logo & Favicon upload
   - Footer Text
   - Active status

## Managing Entities via Frontend Admin Panel

Admins can access `/admin/branding` to:
- Update brand name
- Change colors with live preview
- Upload logo and favicon
- Edit footer text

Changes are applied immediately (may require page reload).

## Multi-Domain Setup

To serve multiple tenants on different domains:

1. Create an Entity for each domain:
   ```bash
   python manage.py create_tenant --name="Client A" --domain="clienta.com"
   python manage.py create_tenant --name="Client B" --domain="clientb.com"
   ```

2. Configure your web server (nginx/Apache) to route domains to the same Django instance

3. The system automatically detects the domain via `request.get_host()` and applies the correct branding

## Development Testing (Localhost)

For local testing with a single domain, the system uses fallback logic:
- If domain is `localhost` or `127.0.0.1`, it returns the first active Entity
- This allows testing without complex DNS setup

## API Endpoints

- `GET /api/v1/entities/config/` - Public endpoint, returns branding for current domain
- `PATCH /api/v1/entities/config/` - Admin-only, update branding for current domain
