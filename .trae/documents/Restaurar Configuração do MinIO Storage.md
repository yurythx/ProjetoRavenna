Vou restaurar e configurar a integração com o MinIO para o armazenamento de arquivos de mídia (imagens dos artigos), conforme solicitado.

Aqui está o plano detalhado:

### 1. Dependências do Backend
Adicionarei as bibliotecas necessárias no `backend/requirements.txt`:
- `django-storages`: Para conectar o Django a serviços de armazenamento S3-compatible.
- `boto3`: SDK da AWS usado pelo django-storages.

### 2. Configuração do Docker
Atualizarei o `docker-compose.yml` para incluir:
- **Serviço MinIO**: O servidor de armazenamento de objetos.
- **Serviço `createbuckets`**: Um container utilitário que roda na inicialização para garantir que o bucket (pasta de armazenamento) exista e tenha as permissões corretas (público para leitura).

### 3. Configuração do Django
Atualizarei o `backend/config/settings.py` para suportar o MinIO:
- Criarei uma lógica para alternar entre `FileSystemStorage` (local) e `MinIOStorage` baseado em variáveis de ambiente (`USE_MINIO=True`).
- Configurarei as credenciais e endpoints do MinIO.
- Manterei os arquivos estáticos (CSS/JS) sendo servidos pelo Whitenoise/Nginx, movendo apenas os arquivos de mídia (uploads) para o MinIO.

### 4. Implementação do Storage
Criarei (ou recriarei, já que não encontrei no código atual) a classe customizada `MinIOStorage` em `backend/apps/core/storage.py` para encapsular as configurações específicas do MinIO (como não usar SSL internamente, mas usar externamente).

### 5. Validação
Após as alterações, você precisará:
1. Atualizar seu arquivo `.env` com as credenciais do MinIO (já existem no `.env.example`).
2. Rodar `docker-compose up --build` para subir os novos serviços.
