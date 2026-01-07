# 🔍 Troubleshooting - Carousel Não Funciona

## ❌ Problema Reportado
O carousel não está funcionando conforme esperado.

## 📋 Checklist de Diagnóstico

### 1. **Verifique se o servidor está rodando**
```bash
npm run dev
```
**Esperado:** Servidor em http://localhost:3000

---

### 2. **Abra o Console do Navegador**
```
Chrome/Edge: F12 ou Ctrl+Shift+I
Firefox: F12 ou Ctrl+Shift+K
```

**Procure por:**
- ❌ Erros em vermelho
- ⚠️ Warnings em amarelo
- 💬 Mensagens de compilação

---

### 3. **Teste de Estado Atual**

Acesse: **http://localhost:3000**

#### O que você vê?

**Opção A:** Logos aparecem mas não animam
```
Possível causa: CSS não carregou
Solução: Ver seção "CSS não carrega"
```

**Opção B:** Logos NÃO aparecem
```
Possível causa: Erro no componente
Solução: Ver seção "Componente com erro"
```

**Opção C:** Logos aparecem empilhados verticalmente
```
Possível causa: Flexbox não aplicado
Solução: Ver seção "Layout quebrado"
```

**Opção D:** Logos aparecem mas não dá para arrastar
```
Possível causa: Event handlers não funcionando
Solução: Ver seção "Drag não funciona"
```

---

## 🔧 Soluções por Problema

### **CSS Não Carrega**

**Teste:**
1. Abra DevTools (F12)
2. Aba "Elements" ou "Inspetor"
3. Clique no div com classe `logos-slide-hybrid`
4. Verifique se tem a propriedade `animation`

**Se NÃO tem:**
```bash
# Reinicie o servidor
Ctrl+C
npm run dev
```

**Se AINDA não funciona:**
```bash
# Limpe o cache
rm -rf .next
npm run dev
```

---

### **Componente com Erro**

**Verifique o Console:**
```
Se aparecer erro como:
"Cannot read property 'current' of undefined"

Solução:
O useRef não foi inicializado corretamente
```

**Fix rápido:**
Certifique-se que tem isso no topo do arquivo `page.tsx`:
```tsx
'use client';

import { useRef } from 'react';
```

---

### **Layout Quebrado (Vertical)**

**Abra DevTools → Elements:**

Verifique se `.logos-slide-hybrid` tem:
```css
display: flex;
flex-direction: row;
```

**Se NÃO tem**, force inline:
```tsx
<div 
  className="logos-slide-hybrid"
  style={{ display: 'flex', flexDirection: 'row' }}
>
```

---

### **Drag Não Funciona**

**Teste 1: Cursor muda para "grab"?**
- ✅ SIM → Event handlers OK, mas drag pode ter bug
- ❌ NÃO → CSS não aplicado

**Teste 2: Console tem erro ao clicar?**
```bash
# Se sim, pode ser:
- scrollRef.current está null
- handleMouseDown não está definido
```

**Fix:**
Adicione console.log para debug:
```tsx
const handleMouseDown = (e: React.MouseEvent) => {
  console.log('Mouse down!', scrollRef.current);
  // ... resto do código
};
```

---

## 🚀 SOLUÇÃO RÁPIDA (Reset Completo)

Se nada funcionou, tente isso:

### **Passo 1: Limpar tudo**
```bash
# No terminal, na pasta frontend:
rm -rf .next
rm -rf node_modules/.cache
```

### **Passo 2: Reiniciar servidor**
```bash
# Pare: Ctrl+C
# Inicie novamente:
npm run dev
```

### **Passo 3: Hard Refresh no navegador**
```bash
# Chrome/Edge/Firefox:
Ctrl + Shift + R

# Ou:
Ctrl + F5
```

---

## 🐛 Debug Passo a Passo

### **1. Verifique o HTML gerado**

DevTools → Elements → Procure:
```html
<div class="logos-slider-hybrid">
  <div class="logos-slide-hybrid">
    <a class="logo-item">...</a>
    <a class="logo-item">...</a>
    <!-- Deve ter 22 logos (11 x 2) -->
  </div>
</div>
```

**Quantos logos aparecem?**
- 11 → ❌ Falta a segunda cópia
- 22 → ✅ Correto!
- 0 → ❌ Array services vazio

---

### **2. Verifique a animação CSS**

DevTools → Elements → Selecione `.logos-slide-hybrid`

Aba "Computed" → Procure:
```
animation: scroll-logos-infinite 40s linear infinite
```

**Se NÃO aparecer:**
```bash
# globals.css não foi carregado
# Verifique se existe em:
src/app/globals.css
```

---

### **3. Teste manual de drag**

Console do navegador:
```javascript
// Cole isso:
const el = document.querySelector('.logos-slide-hybrid');
console.log('Elemento:', el);
console.log('Classes:', el?.className);
console.log('Estilo computado:', getComputedStyle(el));
```

**Esperado:**
```
Elemento: <div class="logos-slide-hybrid">...</div>
Classes: logos-slide-hybrid
Estilo computado: { animation: "scroll-logos-infinite...", ... }
```

---

## 📸 Screenshots para Debug

Tire prints de:
1. **Console** (F12 → Console)
2. **Elements tab** (div selecionado)
3. **Network tab** (globals.css carregou?)

---

## ✅ Checklist Final

- [ ] Servidor está rodando (`npm run dev`)
- [ ] Navegador em http://localhost:3000
- [ ] Hard refresh foi feito (Ctrl+Shift+R)
- [ ] Console não tem erros vermelhos
- [ ] globals.css está carregando
- [ ] div tem classe `logos-slide-hybrid`
- [ ] Há 22 logos no HTML (11 x 2)
- [ ] CSS tem propriedade `animation`

---

## 🆘 Se NADA Funcionar

**Entre em contato e forneça:**
1. Screenshot do console
2. Screenshot do Elements tab
3. Mensagem de erro (se houver)
4. O que acontece quando:
   - Passa o mouse no carousel
   - Tenta arrastar
   - Clica em um logo

---

## 🔥 Solução Alternativa Simples

Se o híbrido está com problema, podemos fazer **APENAS scroll infinito** (sem drag):

Substitua o carousel por:
```tsx
<div className="logos-slider-simple">
  <div className="logos-slide-simple">
    {services.map(...)} {/* 2 vezes */}
  </div>
</div>
```

CSS:
```css
.logos-slide-simple {
  animation: scroll-simple 40s linear infinite;
}

@keyframes scroll-simple {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```

**Isto SEMPRE funciona** (CSS puro, sem JS).

---

Me diga o que você está vendo para eu te ajudar melhor! 🚀
