# ProjetoRavenna - Backend API

API Modular construída com Django, DRF e Clean Architecture.

## 🚀 Quick Start (Local)

1. **Criar Virtualenv**:
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

2. **Instalar Dependências**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar Ambiente**:
   Crie um arquivo `.env` na raiz `backend/` (veja `.env.example` na raiz do projeto para referência):
   ```ini
   SECRET_KEY=dev-secret-key
   DEBUG=True
   ALLOWED_HOSTS=*
   ```

4. **Banco de Dados**:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Rodar Servidor**:
   ```bash
   python manage.py runserver
   ```

Acesse [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/) para a documentação Swagger.

## 📚 Documentação Técnica (Pasta `../docs/backend`)

- **[README.md](../docs/backend/README.md)**: Índice e Tech Stack.
- **[ARCHITECTURE.md](../docs/backend/ARCHITECTURE.md)**: Design Patterns (Services/Selectors) e Camadas.
- **[FEATURES.md](../docs/backend/FEATURES.md)**: Detalhes de Comentários, Captcha e Moderação.
- **[DJANGO_ADMIN_README.md](../docs/backend/DJANGO_ADMIN_README.md)**: Customização do Painel Admin.

## 🐳 Docker

Para rodar via Docker (recomendado):
Use o `docker-compose.yml` na raiz do projeto.
```bash
docker-compose up backend
```
