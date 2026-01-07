# Funcionalidades Específicas

## 💬 Sistema de Comentários

O sistema suporta comentários tanto de usuários autenticados quanto de visitantes (Guests).

### Regras de Negócio
- **Autenticados**: Publicação direta (ou sujeita a moderação dependendo da config).
- **Visitantes**:
  - Devem fornecer Nome, Email e Telefone.
  - Obrigatório completar CAPTCHA.
  - Mensagem "Aguardando aprovação" após envio.
- **Honeypot**: Campo oculto incluído para evitar bots simples.

### Configuração de CAPTCHA

Você pode escolher entre hCaptcha ou reCAPTCHA v2.

No `.env.local`:
```env
NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha   # ou 'recaptcha'
NEXT_PUBLIC_CAPTCHA_SITEKEY=your-site-key
```

O token é validado no backend via endpoint `/api/v1/comments/`.
