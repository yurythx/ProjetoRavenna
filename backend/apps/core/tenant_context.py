import contextvars

# Context variable to store the current tenant ID
_current_tenant_id = contextvars.ContextVar('current_tenant_id', default=None)

def set_current_tenant_id(tenant_id):
    """Set the tenant ID for the current thread/context."""
    return _current_tenant_id.set(tenant_id)

def get_current_tenant_id():
    """Get the tenant ID for the current thread/context."""
    return _current_tenant_id.get()

def clear_current_tenant_id(token=None):
    """Clear the tenant ID from the current context."""
    if token:
        _current_tenant_id.reset(token)
    else:
        _current_tenant_id.set(None)
