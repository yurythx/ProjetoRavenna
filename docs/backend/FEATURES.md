# Funcionalidades do Backend

## 🗨️ Sistema de Comentários

O módulo `articles` suporta comentários de usuários autenticados e visitantes (guests).

### Tipos de Comentário
1. **Autenticado**: Usuário logado. Publicação direta (ou conforme regra de moderação).
2. **Guest**: Visitante. Exige `guest_name`, `guest_email`, `guest_phone` e CAPTCHA.

### Regras de Negócio Guest
- O conteúdo é sanitizado (HTML removido).
- Honeypot field (`hp`) para deter bots simples.
- Rate Limit: 1 comentário por IP a cada 30 segundos.
- Status inicial: `is_approved = false` (Requer moderação).

### Moderação
- Admin aprova/rejeita via Django Admin interface.
- Endpoint de aprovação: `POST /api/v1/articles/comments/{id}/approve/` (Admin only).
- Notificações são enviadas apenas após aprovação.

## 🔐 Validação de CAPTCHA

Para bloquear bots em comentários de guests.

**Configuração (.env):**
```ini
CAPTCHA_PROVIDER=hcaptcha    # ou 'recaptcha'
CAPTCHA_SECRET=your-secret-key
```

O backend valida o token enviado no payload `captcha` consultando a API do provedor (Google ou hCaptcha).

## 🔔 Sistema de Notificações

Notificações assíncronas geradas via Signals ou Services:

- **Novo Comentário**: Notifica o autor do artigo.
- **Resposta**: Notifica o autor do comentário pai.

**Nota Técnica**: Notificações para guests só são disparadas após a transação de aprovação ser commitada (`transaction.on_commit`).

## 🧩 Gerenciamento de Módulos (Tenancy)

Lógica para ativar/desativar módulos inteiros dinamicamente.

1. Middleware: `ModuleMiddleware` intercepta requests para `/api/v1/<slug>/`.
2. Model: `AppModule` define quais slugs estão ativos.
3. Se inativo: Retorna `403 Forbidden` instantaneamente.
