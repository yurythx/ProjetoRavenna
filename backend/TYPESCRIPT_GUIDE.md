# Contract & TypeScript Integration

To ensure full type-safety between the Next.js Frontend and Django Backend, we use **OpenAPI Schema** as the source of truth.

## 1. Backend Configuration
We use `drf-spectacular` with `COMPONENT_SPLIT_REQUEST=True`. This ensures that Read-Only fields (like `id`) are not expected in Write operations (Requests).

## 2. How to Generate Types

### Step A: Export Schema (Backend)
Run this command in the backend folder:
```bash
python manage.py export_contract --file schema.yaml
```
This will create a `schema.yaml` file in the root.

### Step B: Generate TypeScript (Frontend)
In your Next.js project, install the generator:
```bash
npm install -D openapi-typescript
```

Then run:
```bash
npx openapi-typescript ../backend/schema.yaml -o src/types/api.ts
```
*(Adjust the path `../backend/schema.yaml` to where your file is located)*

## 3. Usage in Frontend

Now you have a strictly typed contract.

```typescript
import { components } from '@/types/api';

type Article = components['schemas']['Article'];
type ArticleInput = components['schemas']['ArticleRequest']; // Thanks to COMPONENT_SPLIT_REQUEST

// Usage
const newArticle: ArticleInput = {
  title: "My Post",
  content: "...",
  category: "uuid-..."
  // 'id' is NOT allowed here, which is correct!
}
```
