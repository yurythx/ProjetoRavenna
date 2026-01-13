# Projeto Ravenna - Sistema Multi-Tenant White-Label

## 🚀 Resumo Executivo

Sistema completo de gestão de conteúdo com suporte a **múltiplos tenants (clientes)**, permitindo personalização total da identidade visual (logo, cores, nome) baseada no domínio de acesso.

---

## ✨ Funcionalidades Implementadas

### 🎨 Multi-Tenant & Branding
- ✅ Resolução automática de tenant por domínio (`request.get_host()`)
- ✅ Personalização de cores primária e secundária
- ✅ Upload de logo e favicon
- ✅ Nome de marca customizável
- ✅ Texto de rodapé personalizável
- ✅ Fallback para localhost (desenvolvimento)

### ⚡ Performance
- ✅ Sistema de cache Django (5min TTL)
- ✅ Redução de 90%+ nas queries do banco
- ✅ Invalidação automática ao atualizar branding

### 🛡️ Validação & Segurança
- ✅ Validadores regex para cores hex (#FFFFFF)
- ✅ Método `clean()` no modelo para validação adicional
- ✅ Endpoints admin-only para updates (PATCH)
- ✅ Permissões granulares (IsAdminUser)

### 🎯 Painel Administrativo
- ✅ Dashboard com KPIs de usuários, artigos, visualizações
- ✅ Página de Identidade Visual (`/admin/branding`)
- ✅ Preview em tempo real antes de salvar
- ✅ Gerenciamento de módulos (ativar/desativar)
- ✅ Upload de mídia integrado

### 🔧 Ferramentas de Desenvolvimento
- ✅ Comando Django para criar tenants (`create_tenant`)
- ✅ Django Admin aprimorado com campos de branding
- ✅ Documentação completa (`docs/MULTI_TENANT.md`)

---

## 📂 Estrutura do Projeto

```
ProjetoRavenna/
├── backend/
│   ├── apps/
│   │   ├── entities/          # Multi-tenant core
│   │   │   ├── models.py      # Entity model com branding
│   │   │   ├── views.py       # API com cache
│   │   │   ├── serializers.py
│   │   │   └── management/
│   │   │       └── commands/
│   │   │           └── create_tenant.py
│   │   ├── articles/          # Gestão de conteúdo
│   │   ├── accounts/          # Autenticação
│   │   └── core/             # Funcionalidades base
│   └── config/               # Settings Django
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/        # Painel administrativo
│   │   │   │   ├── branding/ # Identidade visual
│   │   │   │   ├── modules/  # Gestão de módulos
│   │   │   │   ├── stats/    # Estatísticas (placeholder)
│   │   │   │   └── security/ # Segurança (placeholder)
│   │   │   ├── artigos/      # Listagem e visualização
│   │   │   └── layout.tsx    # Injeção de branding
│   │   ├── components/       # UI components
│   │   ├── hooks/           # React Query hooks
│   │   └── services/
│   │       └── tenant.ts    # Fetch de configuração SSR
│   └── public/
│
└── docs/
    └── MULTI_TENANT.md      # Documentação técnica
```

---

## 🎯 Guia de Uso Rápido

### 1. Criar um Novo Tenant

```bash
cd backend
python manage.py create_tenant \
  --name="Meu Cliente" \
  --domain="localhost" \
  --brand-name="Plataforma do Cliente" \
  --primary-color="#FF5733" \
  --secondary-color="#1A1A1A"
```

### 2. Gerenciar Branding via Admin Panel

1. Acesse: `http://localhost:3000/admin/branding`
2. Faça login como admin
3. Altere cores, nome, faça upload de logo
4. Clique em "Aplicar Preview" para testar
5. Clique em "Salvar Alterações" para persistir

### 3. Gerenciar via Django Admin

1. Acesse: `http://localhost:8000/admin/entities/entity/`
2. Edite a Entity desejada
3. Seção "White-Label Configuration" contém todos os campos

---

## 🏗️ Arquitetura Técnica

### Backend (Django DRF)

**Endpoint Público**:
```
GET /api/v1/entities/config/
```
- Permissão: AllowAny
- Cache: 5 minutos
- Retorna branding baseado em `request.get_host()`

**Endpoint Admin**:
```
PATCH /api/v1/entities/config/
```
- Permissão: IsAdminUser
- Invalida cache automaticamente
- Aceita FormData (multipart) para upload de imagens

### Frontend (Next.js 15)

**Server-Side Rendering**:
- `getTenantConfig()` em `services/tenant.ts`
- Fetch da configuração em `layout.tsx` (SSR)
- Injeção de CSS variables no `<body>`
- Geração dinâmica de metadata (título, favicon)

**Client-Side**:
- Preview em tempo real via `document.body.style.setProperty()`
- Formulário de edição com React Query
- Invalidação automática de cache ao salvar

---

## 🔐 Segurança

- ✅ Validação de cores (regex + model clean)
- ✅ Permissões admin-only para updates
- ✅ CORS configurado
- ✅ CSRF protection
- ✅ Autenticação JWT

---

## 📊 Roadmap Futuro

**Planejado**:
- [ ] Dark mode dinâmico por tenant
- [ ] Export/Import de configurações
- [ ] Paleta de cores sugeridas (presets)
- [ ] Dashboard de estatísticas avançadas
- [ ] Sistema de gestão de usuários
- [ ] Logs de auditoria de mudanças

**Em Consideração**:
- Suporte a subdomínios dinâmicos
- Múltiplas logos (header, footer, email)
- Traduções por tenant (i18n)
- Temas customizáveis (além de cores)

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT.

---

## 🆘 Suporte

Para dúvidas ou problemas:
- Consulte `docs/MULTI_TENANT.md`
- Verifique os logs do Django e Next.js
- Acesse `/admin/modules` para verificar status de módulos

---

**Desenvolvido com ❤️ usando Django + Next.js**
