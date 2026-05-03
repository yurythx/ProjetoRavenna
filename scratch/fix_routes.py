import os
import re

root_dir = r"c:\Users\suporte\Desktop\Projetos\ProjetoRavenna\frontend\src"

# Patterns to match and replace
# We look for "/api/ or `/api/ followed by one of the app names
apps = ["blog", "forum", "accounts", "game-logic", "game-data"]
pattern = re.compile(r'([\"`])/api/(' + '|'.join(apps) + r')/')
replacement = r'\1/api/v1/\2/'

updated_count = 0

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = pattern.sub(replacement, content)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated: {path}")
                updated_count += 1

print(f"\nTotal files updated: {updated_count}")
