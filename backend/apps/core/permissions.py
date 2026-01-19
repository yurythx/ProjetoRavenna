from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    The request is authenticated as a user, or is a read-only request.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return request.user and (request.user.is_staff or request.user.is_superuser)

class IsTenantOwner(permissions.BasePermission):
    """
    Allows access only to tenant owners or superusers.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.tenant_role == 'OWNER'

class IsTenantEditor(permissions.BasePermission):
    """
    Allows access to owners and editors.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.tenant_role in ['OWNER', 'EDITOR']

class IsTenantMember(permissions.BasePermission):
    """
    Allows access to any member of the tenant.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.tenant_role in ['OWNER', 'EDITOR', 'MEMBER']
