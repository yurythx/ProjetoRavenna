# Django Admin Configuration

Este documento descreve a configuração completa do Django Admin para a plataforma de artigos.

## 📋 Visão Geral

Todos os modelos da aplicação estão totalmente configurados no Django Admin com funcionalidades avançadas de gerenciamento, filtros, busca e ações personalizadas.

## 🎯 Apps e Modelos Configurados

### 1. **Accounts** (`apps.accounts.admin`)

#### CustomUser
- **List Display**: Email, username, nome, staff status, data de cadastro
- **Filtros**: Staff, superuser, ativo, data de cadastro
- **Busca**: Email, username, nome
- **Actions Customizadas**:
  - Ativar usuários selecionados
  - Desativar usuários selecionados
- **Fieldsets Organizados**: Informações pessoais, permissões, datas importantes
- **Campos Readonly**: UUID, datas de criação/modificação

---

### 2. **Articles** (`apps.articles.admin`)

#### Category (Categoria)
- **List Display**: Nome, slug, contagem de artigos, datas
- **Filtros**: Datas de criação/modificação
- **Busca**: Nome, descrição, slug
- **Features Especiais**:
  - Contagem otimizada de artigos usando annotations
  - Slug gerado automaticamente
- **Campos Readonly**: UUID, slug, datas

#### Tag (Tag)
- **List Display**: Nome, slug, contagem de artigos, datas
- **Filtros**: Datas de criação/modificação
- **Busca**: Nome, slug
- **Features Especiais**:
  - Contagem otimizada de artigos usando annotations
  - Slug gerado automaticamente
- **Campos Readonly**: UUID, slug, datas

#### Article (Artigo)
- **List Display**: Título, autor, categoria, publicado, preview do banner, tags, datas
- **Filtros**: Publicado, categoria, tags, data de criação, autor
- **Busca**: Título, conteúdo, slug, email/username do autor
- **Autocomplete Fields**: Categoria, tags, autor
- **Features Especiais**:
  - Preview visual do banner (imagem)
  - Lista de tags formatada
  - Queries otimizadas com select_related e prefetch_related
  - Hierarquia por data
- **Actions Customizadas**:
  - Publicar artigos selecionados
  - Despublicar artigos selecionados
- **Campos Readonly**: UUID, slug, datas, preview do banner

---

### 3. **Entities** (`apps.entities.admin`)

#### Entity (Entidade)
- **List Display**: Nome, tipo, tax_id (CPF/CNPJ), slug, datas
- **Filtros**: Tipo de entidade (PF/PJ), datas
- **Busca**: Nome, tax_id, slug
- **Features Especiais**:
  - Inline para endereços (GenericTabularInline)
  - Radio buttons para seleção de tipo (PF/PJ)
- **Actions Customizadas**:
  - Converter para Pessoa Física
  - Converter para Pessoa Jurídica
- **Campos Readonly**: UUID, slug, datas

#### Address (Endereço)
- **List Display**: Label, rua, número, cidade, estado, CEP, tipo de conteúdo, data
- **Filtros**: Tipo de conteúdo, estado, cidade, datas
- **Busca**: Label, rua, cidade, estado, CEP, bairro
- **Features Especiais**:
  - **Criação direta desabilitada** - endereços devem ser criados através de Inline nas entidades relacionadas
  - Suporte a GenericForeignKey (pode ser associado a qualquer modelo)
- **Campos Readonly**: UUID, content_type, object_id, datas

---

### 4. **Core** (`apps.core.admin`)

#### AppModule (Módulo do Sistema)
- **List Display**: Nome de exibição, nome, slug, ativo, módulo do sistema, indicador de status, datas
- **Filtros**: Ativo, módulo do sistema, datas
- **Busca**: Nome, nome de exibição, slug
- **Features Especiais**:
  - Indicador visual de status colorido (verde = ativo, vermelho = inativo)
  - Proteção contra desativação de módulos do sistema
  - Campos críticos se tornam readonly para módulos do sistema
  - Campo JSON para configurações
- **Actions Customizadas**:
  - Ativar módulos selecionados
  - Desativar módulos selecionados (com proteção para módulos do sistema)
  - Marcar como módulo do sistema
  - Desmarcar como módulo do sistema
- **Campos Readonly**: UUID, slug, datas

---

## 🎨 Customizações do Admin Site

Foi criado um `CustomAdminSite` em `config/admin.py` com:
- **Site Header**: "Articles Platform Administration"
- **Site Title**: "Articles Admin"
- **Index Title**: "Welcome to Articles Platform Administration"

---

## 🚀 Como Acessar

1. **Criar um superusuário** (se ainda não existir):
```bash
python manage.py createsuperuser
```

2. **Iniciar o servidor**:
```bash
python manage.py runserver
```

3. **Acessar o admin**:
```
http://localhost:8000/admin/
```

---

## 🔍 Funcionalidades Avançadas

### Queries Otimizadas
- Todos os modelos com relacionamentos usam `select_related` e `prefetch_related` para minimizar queries ao banco
- Annotations para contar relacionamentos (ex: número de artigos por categoria)

### Autocomplete
- Campos de relacionamento usam autocomplete para melhor UX
- Busca rápida em dropdowns

### Inline Editing
- Endereços podem ser editados diretamente na página da entidade
- Suporte a Generic Relations

### Visual Enhancements
- Preview de imagens do banner
- Indicadores coloridos de status
- Listas de tags formatadas

### Proteções de Segurança
- Módulos do sistema não podem ser desativados por ação em massa
- Campos críticos se tornam readonly quando necessário
- Validações personalizadas

### Bulk Actions
- Ações em massa para ativar/desativar usuários
- Publicar/despublicar artigos
- Converter tipos de entidades

---

## 📝 Próximos Passos Sugeridos

1. **Testes**: Criar testes automatizados para as configurações do admin
2. **Permissões**: Implementar grupos de permissões para diferentes tipos de administradores
3. **Audit Log**: Adicionar histórico de mudanças usando pacotes como `django-simple-history`
4. **Import/Export**: Integrar `django-import-export` para facilitar importação/exportação de dados
5. **Dashboard**: Adicionar widgets personalizados na página inicial do admin

---

## 🛠️ Manutenção

Ao adicionar novos modelos:
1. Crie a classe de configuração do admin no arquivo `admin.py` do app
2. Use o decorator `@admin.register(ModelName)` para registrar o modelo
3. Configure os atributos: `list_display`, `list_filter`, `search_fields`, `readonly_fields`
4. Adicione actions personalizadas se necessário
5. Otimize queries em `get_queryset()` se houver relacionamentos

---

## 📚 Referências

- [Django Admin Documentation](https://docs.djangoproject.com/en/stable/ref/contrib/admin/)
- [ModelAdmin Options](https://docs.djangoproject.com/en/stable/ref/contrib/admin/#modeladmin-options)
- [Admin Actions](https://docs.djangoproject.com/en/stable/ref/contrib/admin/actions/)
