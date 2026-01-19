import os
import django
from django.core.mail import send_mail
from unittest.mock import patch

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.entities.models import Entity
from apps.core.tenant_context import set_current_tenant_id, clear_current_tenant_id

def verify_tenant_smtp():
    # 1. Setup Tenant with custom SMTP
    e1, _ = Entity.objects.get_or_create(
        domain='smtp-test.local', 
        defaults={
            'name': 'SMTP Tenant',
            'brand_name': 'SMTP Branding',
            'slug': 'smtp-test',
            'smtp_host': 'smtp.tenant1.com',
            'smtp_port': 587,
            'smtp_user': 'user@tenant1.com',
            'smtp_password': 'password123',
            'email_from_address': 'alerts@tenant1.com',
            'email_from_name': 'Tenant 1 Alerts'
        }
    )
    
    print(f"Testing SMTP for Tenant: {e1.name}")
    
    # 2. Mocking the actual SMTP connection AND the send_messages call
    with patch('django.core.mail.backends.smtp.EmailBackend.open') as mock_open:
        with patch('django.core.mail.backends.smtp.EmailBackend.send_messages') as mock_send:
            token = set_current_tenant_id(str(e1.id))
            try:
                send_mail(
                    'Subject',
                    'Message',
                    'noreply@projetoravenna.com', # Default
                    ['to@example.com'],
                    fail_silently=False,
                )
                
                # Retrieve connection to check connection params
                from django.core.mail import get_connection
                conn = get_connection()
                
                print(f"Connection Host: {conn.host}")
                assert conn.host == 'smtp.tenant1.com'
                
                # Check injected From address
                # mock_send.call_args[0][0] is the list of messages
                if mock_send.call_args:
                    msg = mock_send.call_args[0][0][0]
                    print(f"Injected Message From: {msg.from_email}")
                    assert "Tenant 1 Alerts" in msg.from_email
                    assert "alerts@tenant1.com" in msg.from_email
                else:
                    print("Error: send_messages was not called")
                    return False
                
                print("PASS: TenantEmailBackend dynamically loaded SMTP settings and injected branded From address!")
                
            finally:
                clear_current_tenant_id(token)

    # 3. Test Fallback (No Tenant)
    clear_current_tenant_id(None)
    from django.core.mail import get_connection
    conn_fallback = get_connection()
    print(f"Fallback Host (Global): {conn_fallback.host}")
    
    print("\n--- TENANT SMTP VERIFICATION PASSED ---")
    return True

if __name__ == "__main__":
    from django.conf import settings
    settings.ALLOWED_HOSTS = ['*']
    if verify_tenant_smtp():
        exit(0)
    else:
        exit(1)
