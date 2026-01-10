# Passo a passo para corrigir o MinIO

Se o comando automático falhou porque o Docker não está no PATH deste terminal, por favor rode manualmente no seu terminal onde o Docker funciona:

1. Certifique-se que os containers estão rodando:
   `docker-compose up -d`

2. Execute o comando de correção dentro do container web:
   `docker-compose exec web python manage.py fix_minio`

Isso vai:
- Criar o bucket se não existir
- Definir a política como PÚBLICA (leitura anônima)
- Configurar CORS para aceitar requisições de qualquer origem (correção para o frontend)
