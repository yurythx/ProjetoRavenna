import json
import os
from pathlib import Path

# Caminhos dos arquivos de tradução
frontend_path = Path(r"c:\Users\yuri.menezes\Desktop\Projetos\ProjetoRavenna\frontend")
messages_path = frontend_path / "messages"

# Carregar os 3 arquivos de tradução
with open(messages_path / "pt-br.json", "r", encoding="utf-8") as f:
    pt_br = json.load(f)

with open(messages_path / "en.json", "r", encoding="utf-8") as f:
    en = json.load(f)

with open(messages_path / "es.json", "r", encoding="utf-8") as f:
    es = json.load(f)

def get_all_keys(obj, prefix=""):
    """Recursivamente obtém todas as chaves de um objeto JSON aninhado"""
    keys = []
    for key, value in obj.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            keys.extend(get_all_keys(value, full_key))
        else:
            keys.append(full_key)
    return keys

# Obter todas as chaves de cada arquivo
pt_keys = set(get_all_keys(pt_br))
en_keys = set(get_all_keys(en))
es_keys = set(get_all_keys(es))

print("=" * 80)
print("AUDITORIA DE TRADUÇÕES - PROJETO RAVENNA")
print("=" * 80)
print()

# Encontrar diferenças
print("📊 ESTATÍSTICAS:")
print(f"   PT-BR: {len(pt_keys)} chaves")
print(f"   EN:    {len(en_keys)} chaves")
print(f"   ES:    {len(es_keys)} chaves")
print()

# Chaves faltando em EN
missing_en = pt_keys - en_keys
if missing_en:
    print("⚠️  FALTANDO EM EN (Inglês):")
    for key in sorted(missing_en):
        print(f"   - {key}")
    print()
else:
    print("✅ Nenhuma chave faltando em EN")
    print()

# Chaves faltando em ES
missing_es = pt_keys - es_keys
if missing_es:
    print("⚠️  FALTANDO EM ES (Espanhol):")
    for key in sorted(missing_es):
        print(f"   - {key}")
    print()
else:
    print("✅ Nenhuma chave faltando em ES")
    print()

# Chaves extras em EN (que não existem em PT-BR)
extra_en = en_keys - pt_keys
if extra_en:
    print("ℹ️  CHAVES EXTRAS EM EN:")
    for key in sorted(extra_en):
        print(f"   - {key}")
    print()

# Chaves extras em ES (que não existem em PT-BR)
extra_es = es_keys - pt_keys
if extra_es:
    print("ℹ️  CHAVES EXTRAS EM ES:")
    for key in sorted(extra_es):
        print(f"   - {key}")
    print()

# Chaves que existem em EN mas faltam em ES
missing_es_from_en = en_keys - es_keys
if missing_es_from_en:
    print("⚠️  CHAVES EM EN MAS NÃO EM ES:")
    for key in sorted(missing_es_from_en):
        print(f"   - {key}")
    print()

# Resumo final
print("=" * 80)
print("RESUMO:")
all_issues = len(missing_en) + len(missing_es) + len(missing_es_from_en)
if all_issues == 0:
    print("✅ Todos os arquivos de tradução estão sincronizados!")
else:
    print(f"⚠️  Total de inconsistências encontradas: {all_issues}")
print("=" * 80)
