"""
Management command para testar a conexão e configuração do MinIO.

Uso:
    python manage.py test_minio
    python manage.py test_minio --check-bucket
    python manage.py test_minio --test-upload
"""
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import boto3
from botocore.exceptions import ClientError, NoCredentialsError


class Command(BaseCommand):
    help = 'Testa a conexão e configuração do MinIO'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-bucket',
            action='store_true',
            help='Verifica se o bucket existe e tem permissões corretas',
        )
        parser.add_argument(
            '--test-upload',
            action='store_true',
            help='Testa upload e geração de URL de um arquivo',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostra informações detalhadas',
        )

    def handle(self, *args, **options):
        self.verbose = options['verbose']
        
        # Verificar se MinIO está habilitado
        if not getattr(settings, 'USE_MINIO', False):
            self.stdout.write(
                self.style.WARNING('⚠️  MinIO não está habilitado (USE_MINIO=False)')
            )
            self.stdout.write('Configure USE_MINIO=True no .env para usar MinIO')
            return

        self.stdout.write(self.style.SUCCESS('✅ MinIO está habilitado'))
        self.stdout.write('')

        # 1. Verificar configurações
        self.check_configuration()

        # 2. Testar conexão
        self.test_connection()

        # 3. Verificar bucket (se solicitado)
        if options['check_bucket']:
            self.check_bucket()

        # 4. Testar upload (se solicitado)
        if options['test_upload']:
            self.test_upload()

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✅ Todos os testes concluídos!'))

    def check_configuration(self):
        """Verifica se as configurações estão corretas"""
        self.stdout.write(self.style.HTTP_INFO('📋 Verificando configurações...'))
        
        configs = {
            'AWS_ACCESS_KEY_ID': getattr(settings, 'AWS_ACCESS_KEY_ID', None),
            'AWS_SECRET_ACCESS_KEY': '***' if getattr(settings, 'AWS_SECRET_ACCESS_KEY', None) else None,
            'AWS_STORAGE_BUCKET_NAME': getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None),
            'AWS_S3_ENDPOINT_URL': getattr(settings, 'AWS_S3_ENDPOINT_URL', None),
            'AWS_S3_CUSTOM_DOMAIN': getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None),
            'AWS_S3_SIGNATURE_VERSION': getattr(settings, 'AWS_S3_SIGNATURE_VERSION', None),
            'AWS_S3_ADDRESSING_STYLE': getattr(settings, 'AWS_S3_ADDRESSING_STYLE', None),
        }

        missing = []
        for key, value in configs.items():
            if value is None:
                missing.append(key)
            elif self.verbose:
                self.stdout.write(f'   {key}: {value}')

        if missing:
            self.stdout.write(
                self.style.ERROR(f'❌ Configurações faltando: {", ".join(missing)}')
            )
            raise CommandError('Configurações do MinIO incompletas')
        else:
            self.stdout.write(self.style.SUCCESS('✅ Todas as configurações estão presentes'))

        self.stdout.write('')

    def test_connection(self):
        """Testa a conexão com o MinIO"""
        self.stdout.write(self.style.HTTP_INFO('🔌 Testando conexão com MinIO...'))
        
        try:
            s3_client = boto3.client(
                's3',
                endpoint_url=getattr(settings, 'AWS_S3_ENDPOINT_URL'),
                aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY'),
                config=boto3.session.Config(
                    signature_version=getattr(settings, 'AWS_S3_SIGNATURE_VERSION', 's3v4'),
                    s3={
                        'addressing_style': getattr(settings, 'AWS_S3_ADDRESSING_STYLE', 'path')
                    }
                )
            )
            
            # Tentar listar buckets (testa conexão)
            s3_client.list_buckets()
            
            self.stdout.write(self.style.SUCCESS('✅ Conexão com MinIO estabelecida com sucesso'))
            
            if self.verbose:
                buckets = s3_client.list_buckets()
                self.stdout.write(f'   Buckets disponíveis: {len(buckets.get("Buckets", []))}')
                for bucket in buckets.get('Buckets', []):
                    self.stdout.write(f'   - {bucket["Name"]}')
        
        except NoCredentialsError:
            self.stdout.write(
                self.style.ERROR('❌ Erro: Credenciais não encontradas')
            )
            raise CommandError('Verifique AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY')
        
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            self.stdout.write(
                self.style.ERROR(f'❌ Erro ao conectar: {error_code}')
            )
            if self.verbose:
                self.stdout.write(f'   Detalhes: {str(e)}')
            raise CommandError(f'Falha na conexão: {error_code}')
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro inesperado: {str(e)}')
            )
            raise CommandError(f'Erro ao testar conexão: {str(e)}')

        self.stdout.write('')

    def check_bucket(self):
        """Verifica se o bucket existe e tem permissões corretas"""
        self.stdout.write(self.style.HTTP_INFO('🪣 Verificando bucket...'))
        
        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME')
        
        try:
            s3_client = boto3.client(
                's3',
                endpoint_url=getattr(settings, 'AWS_S3_ENDPOINT_URL'),
                aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY'),
                config=boto3.session.Config(
                    signature_version=getattr(settings, 'AWS_S3_SIGNATURE_VERSION', 's3v4'),
                    s3={'addressing_style': getattr(settings, 'AWS_S3_ADDRESSING_STYLE', 'path')}
                )
            )
            
            # Verificar se bucket existe
            try:
                s3_client.head_bucket(Bucket=bucket_name)
                self.stdout.write(self.style.SUCCESS(f'✅ Bucket "{bucket_name}" existe'))
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                if error_code == '404':
                    self.stdout.write(
                        self.style.ERROR(f'❌ Bucket "{bucket_name}" não existe')
                    )
                    self.stdout.write(
                        self.style.WARNING(
                            f'   Execute: docker-compose exec minio mc mb myminio/{bucket_name}'
                        )
                    )
                    raise CommandError(f'Bucket não encontrado: {bucket_name}')
                else:
                    raise
            
            # Tentar listar objetos (testa permissões de leitura)
            try:
                objects = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
                self.stdout.write(self.style.SUCCESS('✅ Permissões de leitura OK'))
                
                if self.verbose:
                    total_objects = objects.get('KeyCount', 0)
                    if 'Contents' in objects:
                        self.stdout.write(f'   Objetos no bucket: {total_objects}+')
                    else:
                        self.stdout.write('   Bucket está vazio')
            
            except ClientError as e:
                self.stdout.write(
                    self.style.WARNING('⚠️  Não foi possível listar objetos (pode ser normal)')
                )
                if self.verbose:
                    self.stdout.write(f'   Erro: {str(e)}')
            
            # Tentar fazer upload de teste (testa permissões de escrita)
            try:
                test_key = 'test/permissions_check.txt'
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=test_key,
                    Body=b'test',
                    ContentType='text/plain'
                )
                # Limpar arquivo de teste
                s3_client.delete_object(Bucket=bucket_name, Key=test_key)
                self.stdout.write(self.style.SUCCESS('✅ Permissões de escrita OK'))
            
            except ClientError as e:
                self.stdout.write(
                    self.style.ERROR('❌ Erro ao testar escrita no bucket')
                )
                if self.verbose:
                    self.stdout.write(f'   Erro: {str(e)}')
                raise CommandError('Sem permissão para escrever no bucket')
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro ao verificar bucket: {str(e)}')
            )
            raise CommandError(f'Falha ao verificar bucket: {str(e)}')

        self.stdout.write('')

    def test_upload(self):
        """Testa upload de arquivo e geração de URL"""
        self.stdout.write(self.style.HTTP_INFO('📤 Testando upload e geração de URL...'))
        
        try:
            # Criar arquivo de teste
            test_content = b'Test file content for MinIO connection test'
            test_file = ContentFile(test_content, name='test_minio_connection.txt')
            
            # Salvar usando o storage backend
            path = default_storage.save('test/minio_test.txt', test_file)
            self.stdout.write(self.style.SUCCESS(f'✅ Arquivo salvo: {path}'))
            
            # Gerar URL
            url = default_storage.url(path)
            self.stdout.write(self.style.SUCCESS(f'✅ URL gerada: {url}'))
            
            # Verificar se URL está correta
            custom_domain = getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None)
            if custom_domain:
                if custom_domain in url:
                    self.stdout.write(
                        self.style.SUCCESS('✅ URL usa o domínio customizado corretamente')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠️  URL não contém o domínio esperado ({custom_domain})'
                        )
                    )
            else:
                self.stdout.write(
                    self.style.WARNING('⚠️  MINIO_PUBLIC_DOMAIN não configurado')
                )
            
            # Limpar arquivo de teste
            default_storage.delete(path)
            self.stdout.write(self.style.SUCCESS('✅ Arquivo de teste removido'))
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro ao testar upload: {str(e)}')
            )
            if self.verbose:
                import traceback
                self.stdout.write(traceback.format_exc())
            raise CommandError(f'Falha no teste de upload: {str(e)}')

        self.stdout.write('')
