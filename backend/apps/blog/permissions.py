from rest_framework import permissions


class IsBlogEditor(permissions.BasePermission):
    """Allows access only to blog editors and admins."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_active_and_not_banned
            and request.user.is_verified
            and (
                request.user.groups.filter(name="blog_editors").exists()
                or request.user.is_staff
            )
        )


class IsBlogEditorOrReadOnly(permissions.BasePermission):
    """Blog editors have write access, others read-only."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        return (
            request.user.is_active_and_not_banned
            and request.user.is_verified
            and (
                request.user.groups.filter(name="blog_editors").exists()
                or request.user.is_staff
            )
        )


class IsAuthorOrBlogEditor(permissions.BasePermission):
    """Allows access to post author or blog editors."""

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_active_and_not_banned or not request.user.is_verified:
            return False

        if request.user.is_staff:
            return True

        if request.user.groups.filter(name="blog_editors").exists():
            return True

        if hasattr(obj, "author") and obj.author == request.user:
            return True

        return False
