import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.core.mail import send_mail
from apps.entities.models import Entity
from apps.core.tenant_context import set_current_tenant_id

def test_tenant_smtp(tenant_slug, recipient_email):
    try:
        tenant = Entity.objects.get(slug=tenant_slug)
        print(f"Testing SMTP for tenant: {tenant.name} ({tenant.domain})")
        
        if not tenant.smtp_host:
            print("Error: Tenant has no SMTP host configured.")
            return

        # Set tenant context for the backend to pick up
        set_current_tenant_id(tenant.id)
        
        subject = f"Test Email - {tenant.brand_name or tenant.name}"
        message = "This is a test email to verify your SMTP configuration in Projeto Ravenna."
        
        send_mail(
            subject,
            message,
            None, # Will use the branded 'from' from the backend
            [recipient_email],
            fail_silently=False,
        )
        print(f"Success! Test email sent to {recipient_email}")
        
    except Entity.DoesNotExist:
        print(f"Error: Tenant with slug '{tenant_slug}' not found.")
    except Exception as e:
        print(f"Error sending email: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python verify_smtp.py <tenant_slug> <recipient_email>")
    else:
        test_tenant_smtp(sys.argv[1], sys.argv[2])
