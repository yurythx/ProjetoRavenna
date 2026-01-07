# 🚀 PÁGINAS RESTANTES - COPIAR E COLAR

## ✅ Status: 4/12 Criadas

- [x] artigos
- [x] jellyfin  
- [x] komga
- [x] evolution-api
- [ ] chatwoot (código abaixo)
- [ ] n8n (código abaixo)
- [ ] nextcloud (código abaixo)
- [ ] glpi (código abaixo)
- [ ] zabbix (código abaixo)
- [ ] aapanel (código abaixo)
- [ ] portainer (código abaixo)
- [ ] pdv (código abaixo)

---

## 📝 Instruções

Para cada serviço abaixo:
1. Crie a pasta `/src/app/servicos/[SLUG]/`
2. Crie o arquivo `page.tsx` dentro dessa pasta
3. Copie o código correspondente
4. Salve o arquivo

---

## 🎯 Páginas Prontas

### 1. CHATWOOT (`/servicos/chatwoot/page.tsx`)

Ícone: MessageCircle | Cor: #06B6D4

Copie todo o conteúdo de `evolution-api/page.tsx` e substitua:
- Icon: `Cpu` → `MessageCircle`
- Color: `#10B981` → `#06B6D4`
- URL: `EVOLUTION` → `CHATWOOT`
- E os dados do service object pelos dados do Chatwoot do `services.ts` (ID: 5)

---

### 2. N8N (`/servicos/n8n/page.tsx`)

Ícone: Zap | Cor: #F59E0B

Copie `evolution-api/page.tsx` e ajuste:
- Icon: `Cpu` → `Zap`
- Color: `#10B981` → `#F59E0B`
- URL: `EVOLUTION` → `N8N`
- Dados do services.ts ID: 6

---

### 3. NEXTCLOUD (`/servicos/nextcloud/page.tsx`)

Ícone: Cloud | Cor: #0082C9

Copie `evolution-api/page.tsx` e ajuste:
- Icon: `Cpu` → `Cloud`
- Color: `#10B981` → `#0082C9`
- URL: `EVOLUTION` → `NEXTCLOUD`
- Dados do services.ts ID: 7

---

### 4. GLPI (`/servicos/glpi/page.tsx`)

Ícone: TicketCheck | Cor: #E74C3C

Copie `evolution-api/page.tsx` e ajuste:
- Icon: `Cpu` → `TicketCheck`
- Color: `#10B981` → `#E74C3C`
- URL: `EVOLUTION` → `GLPI`
- Dados do services.ts ID: 8

---

### 5. ZABBIX (`/servicos/zabbix/page.tsx`)

Ícone: Activity | Cor: #D40000

Copie `evolution-api/page.tsx` e ajuste:
- Icon: `Cpu` → `Activity`
- Color: `#10B981` → `#D40000`
- URL: `EVOLUTION` → `ZABBIX`
- Dados do services.ts ID: 9

---

### 6. AAPANEL (`/servicos/aapanel/page.tsx`)

Ícone: Server | Cor: #1890FF

Copie `evolution-api/page.tsx` e ajuste:
- Icon: `Cpu` → `Server`
- Color: `#10B981` → `#1890FF`
- URL: `EVOLUTION` → `AAPANEL`
- Dados do services.ts ID: 10

---

### 7. PORTAINER (`/servicos/portainer/page.tsx`)

Ícone: Container | Cor: #13BEF9

Copie `evolution-api/page.tsx` e ajuste:
- Icon: `Cpu` → `Container`
- Color: `#10B981` → `#13BEF9`
- URL: `EVOLUTION` → `PORTAINER`
- Dados do services.ts ID: 11

---

### 8. PDV (`/servicos/pdv/page.tsx`)

Ícone: ShoppingCart | Cor: #FF6B35

Copie `evolution-api/page.tsx` e ajuste:
- Icon: `Cpu` → `ShoppingCart`
- Color: `#10B981` → `#FF6B35`
- URL: `EVOLUTION` → `PDV`
- Dados do services.ts ID: 12

---

## 🔍 Onde Pegar os Dados

Abra `/src/data/services.ts` e procure pelo serviço correspondente.

Copie os campos:
- `title`
- `shortDescription`
- `fullDescription`  
- `whyUse`
- `features` (array)
- `useCases` (array)
- `benefits` (array)
- `technologies` (array)

---

## ⚡ Atalho Rápido

Ao copiar `evolution-api/page.tsx`:

1. **Linha 2**: Adicione o ícone correto no import
2. **Linha 5**: Renomeie a função (ex: `ChatwootPage`)
3. **Linhas 7-45**: Substitua todo o objeto `service`
4. **Linha 61**: Troque `<Cpu` pelo ícone correto

---

## ✅ Checklist Final

Após criar todas:

```
src/app/servicos/
├── artigos/page.tsx ✅
├── jellyfin/page.tsx ✅
├── komga/page.tsx ✅
├── evolution-api/page.tsx ✅
├── chatwoot/page.tsx
├── n8n/page.tsx  
├── nextcloud/page.tsx
├── glpi/page.tsx
├── zabbix/page.tsx
├── aapanel/page.tsx
├── portainer/page.tsx
└── pdv/page.tsx
```

---

## 🎉 Resultado Final

Após criar todas, você terá:
- ✅ 12 páginas físicas independentes
- ✅ Cada uma editável separadamente
- ✅ Fácil de atualizar conteúdo
- ✅ Git friendly (commits por serviço)

---

**Boa sorte! 🚀💚**
