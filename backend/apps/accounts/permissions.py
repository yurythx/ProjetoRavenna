from rest_framework import permissions


class IsPlayer(permissions.BasePermission):
    """Allows access only to players."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_active_and_not_banned
            and request.user.groups.filter(name="players").exists()
        )


class IsBlogEditor(permissions.BasePermission):
    """Allows access only to blog editors."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_active_and_not_banned
            and request.user.groups.filter(name="blog_editors").exists()
        )


class IsForumModerator(permissions.BasePermission):
    """Allows access only to forum moderators."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_active_and_not_banned
            and request.user.groups.filter(name="forum_moderators").exists()
        )


class IsAdmin(permissions.BasePermission):
    """Allows access only to admins (staff or superuser)."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or request.user.is_superuser


class IsSuperUser(permissions.BasePermission):
    """Allows access only to superusers."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser


class IsAdminOrReadOnly(permissions.BasePermission):
    """Admin has full access, others read-only."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return request.user.is_staff or request.user.is_superuser


class IsOwnerOrAdmin(permissions.BasePermission):
    """Allows access to the owner or admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True

        if hasattr(obj, "owner"):
            return obj.owner == request.user

        if hasattr(obj, "user"):
            return obj.user == request.user

        return obj == request.user


class IsOwnerOnly(permissions.BasePermission):
    """Allows access only to the owner."""

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, "owner"):
            return obj.owner == request.user

        if hasattr(obj, "user"):
            return obj.user == request.user

        return obj == request.user


class IsNotBanned(permissions.BasePermission):
    """Allows access only to non-banned users."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_active_and_not_banned


class IsVerified(permissions.BasePermission):
    """Allows access only to verified users."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_verified


class IsGameUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_active_and_not_banned
            and request.user.is_verified
            and request.user.groups.filter(name="players").exists()
        )


class AllowAnyForRegistration(permissions.BasePermission):
    """Allow anyone to register, but require auth for other actions."""

    def has_permission(self, request, view):
        if request.method == "POST" and view.action in ["create", "register"]:
            return True
        return request.user and request.user.is_authenticated


class CanModerateForum(permissions.BasePermission):
    """Permission for forum moderation actions."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.is_active_and_not_banned:
            return False

        return request.user.groups.filter(name="forum_moderators").exists() or request.user.is_staff


class CanEditBlog(permissions.BasePermission):
    """Permission for blog editing actions."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.is_active_and_not_banned:
            return False

        return (
            request.user.groups.filter(name="blog_editors").exists()
            or request.user.is_staff
        )
