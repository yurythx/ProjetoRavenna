from django.core.mail.backends.smtp import EmailBackend
from apps.core.tenant_context import get_current_tenant_id
from apps.entities.models import Entity
from django.conf import settings

class TenantEmailBackend(EmailBackend):
    """
    SMTP email backend that dynamically resolves tenant settings.
    If no tenant is active or no SMTP is configured, it falls back to global settings.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._set_tenant_config()

    def _set_tenant_config(self):
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            return

        try:
            tenant = Entity.objects.get(id=tenant_id)
            if tenant.smtp_host:
                self.host = tenant.smtp_host
                self.port = tenant.smtp_port or 587
                self.username = tenant.smtp_user
                self.password = tenant.smtp_password
                self.use_tls = tenant.smtp_use_tls
                self.use_ssl = getattr(tenant, 'smtp_use_ssl', False) # If we add this field later
                self.timeout = 10
        except Entity.DoesNotExist:
            pass

    def send_messages(self, email_messages):
        # Reinforce config before sending
        self._set_tenant_config()
        
        tenant_id = get_current_tenant_id()
        if tenant_id:
            try:
                tenant = Entity.objects.get(id=tenant_id)
                if tenant.email_from_address:
                    from_name = tenant.email_from_name or tenant.brand_name or tenant.name
                    branded_from = f"{from_name} <{tenant.email_from_address}>"
                    
                    for msg in email_messages:
                        # Only override if it's the default or missing
                        if not msg.from_email or msg.from_email == settings.DEFAULT_FROM_EMAIL:
                            msg.from_email = branded_from
            except Entity.DoesNotExist:
                pass
                
        return super().send_messages(email_messages)
