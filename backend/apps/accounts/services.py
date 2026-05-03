import secrets
import uuid
from datetime import timedelta
from typing import Optional

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from apps.accounts.validators import CustomValidators

User = get_user_model()


class AdminAuditService:
    @classmethod
    def record(
        cls,
        *,
        action: str,
        actor: Optional[User],
        target: User,
        metadata: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        from apps.accounts.models import AdminAuditEvent

        AdminAuditEvent.objects.create(
            actor=actor,
            target=target,
            action=action,
            metadata=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent or "",
        )


class UserRegistrationService:
    """Service for user registration operations."""

    DEFAULT_GROUP = "players"

    @classmethod
    @transaction.atomic
    def register_user(
        cls,
        email: str,
        username: str,
        password: str,
        display_name: Optional[str] = None,
        birth_date=None,
        gender: Optional[str] = None,
        registration_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        hwid: Optional[str] = None,
        send_welcome_email: bool = True,
    ) -> User:
        """
        Register a new user.

        Args:
            email: User's email address
            username: Unique username
            password: User's password (will be hashed)
            display_name: Optional display name
            birth_date: Optional birth date
            registration_ip: IP address for audit
            hwid: Optional hardware ID
            send_welcome_email: Whether to send welcome email

        Returns:
            Created User instance

        Raises:
            ValueError: If validation fails or user exists
        """
        from django.core.exceptions import ValidationError as DjangoValidationError

        email = CustomValidators.validate_email(email)
        username = CustomValidators.validate_username(username)
        try:
            password = CustomValidators.validate_password(password)
        except DjangoValidationError as e:
            raise ValueError(str(e))

        if User.objects.filter(email__iexact=email).exists():
            raise ValueError("Email already registered.")

        if User.objects.filter(username__iexact=username).exists():
            raise ValueError("Username already taken.")

        if birth_date:
            try:
                birth_date = CustomValidators.validate_birth_date(birth_date)
            except DjangoValidationError as e:
                raise ValueError(str(e))

        if hwid:
            hwid = CustomValidators.validate_hwid(hwid)

        user = User(
            email=email,
            username=username,
            display_name=display_name or username,
            birth_date=birth_date,
            gender=gender or User.Gender.NOT_SPECIFIED,
            registration_ip=registration_ip or "",
            hwid=hwid or "",
            verification_token=secrets.token_urlsafe(32),
            verification_token_created_at=timezone.now(),
            is_active=False,
        )
        user.set_password(password)
        user.save()

        player_group = Group.objects.filter(name=cls.DEFAULT_GROUP).first()
        if player_group:
            user.groups.add(player_group)

        AdminAuditService.record(
            action="register_user",
            actor=None,
            target=user,
            metadata={},
            ip_address=registration_ip,
            user_agent=user_agent,
        )

        if send_welcome_email:
            cls._send_welcome_email(user)

        return user

    @staticmethod
    def _send_welcome_email(user: User) -> None:
        from apps.accounts.tasks import send_email_task
        send_email_task.delay(
            to_email=user.email,
            subject="Welcome to Projeto Ravenna!",
            body=f"Hi {user.display_name},\n\nWelcome to our game platform!",
        )


class UserAuthenticationService:
    """Service for authentication operations."""

    @classmethod
    def authenticate(
        cls,
        email: str,
        password: str,
        hwid: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Optional[User]:
        """
        Authenticate user with email and password.

        Args:
            email: User's email
            password: User's password
            hwid: Optional hardware ID for game client auth
            ip_address: IP address for audit

        Returns:
            User if authenticated, None otherwise
        """
        user = User.objects.get_by_email(email)

        if not user:
            return None

        if not user.check_password(password):
            return None

        if not user.is_active_and_not_banned:
            return None
        if not user.is_verified and not user.is_staff and not user.is_superuser:
            return None

        if hwid and user.hwid and user.hwid != hwid:
            return None

        try:
            user.last_login = timezone.now()
            user.last_login_ip = ip_address
            # Save without update_fields to be more robust during debugging
            user.save()
        except Exception as e:
            # Log the error so we can see it in docker logs
            print(f"DEBUG: Login save error for {user.email}: {str(e)}")
            # Even if save fails, we might want to allow login, but 500 is happening here
            raise e

        return user

    @classmethod
    def verify_token(cls, token: str) -> Optional[User]:
        """Verify email verification token."""
        return User.objects.filter(
            verification_token=token,
            verification_token_created_at__gte=timezone.now() - timedelta(days=7),
        ).first()

    @classmethod
    def request_password_reset(cls, email: str) -> Optional[str]:
        """
        Request password reset.

        Returns:
            Reset token if user exists
        """
        user = User.objects.get_by_email(email)
        if not user:
            return None

        reset_token = secrets.token_urlsafe(32)
        user.verification_token = reset_token
        user.verification_token_created_at = timezone.now()
        user.save(update_fields=["verification_token", "verification_token_created_at"])

        return reset_token


class UserManagementService:
    """Service for user management operations (admin/moderator)."""

    @classmethod
    @transaction.atomic
    def ban_user(
        cls,
        user: User,
        reason: str,
        banned_by: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """
        Ban a user.

        Args:
            user: User to ban
            reason: Reason for ban
            banned_by: Admin/moderator performing the ban

        Returns:
            Banned user
        """
        if not banned_by.is_admin and not banned_by.is_forum_moderator:
            raise PermissionError("You don't have permission to ban users.")

        if user.is_superuser:
            raise ValueError("Cannot ban a superuser.")

        if banned_by.is_forum_moderator and not user.is_forum_moderator:
            reason = CustomValidators.validate_ban_reason(reason)
            user.ban(reason=reason, banned_by=banned_by)
            AdminAuditService.record(
                action="ban",
                actor=banned_by,
                target=user,
                metadata={"reason": reason},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return user

        if banned_by.is_admin:
            reason = CustomValidators.validate_ban_reason(reason)
            user.ban(reason=reason, banned_by=banned_by)
            AdminAuditService.record(
                action="ban",
                actor=banned_by,
                target=user,
                metadata={"reason": reason},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return user

        raise PermissionError("Insufficient permissions to ban this user.")

    @classmethod
    @transaction.atomic
    def unban_user(
        cls,
        user: User,
        unbanned_by: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """Unban a user."""
        if not unbanned_by.is_admin:
            raise PermissionError("Only admins can unban users.")

        user.unban()
        AdminAuditService.record(
            action="unban",
            actor=unbanned_by,
            target=user,
            metadata={},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return user

    @classmethod
    @transaction.atomic
    def update_user(
        cls,
        user: User,
        data: dict,
        updated_by: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """Update user profile."""
        allowed_fields = ["display_name", "birth_date", "gender"]

        if updated_by.is_admin:
            allowed_fields.extend(["is_active", "is_staff"])

        if updated_by.is_superuser:
            allowed_fields.extend(["is_superuser"])

        before = {}
        changes = {}
        for field in allowed_fields:
            if field in data:
                if field in ["is_staff", "is_superuser"] and user.pk == updated_by.pk:
                    raise PermissionError("Cannot change your own role.")
                if field in ["is_staff", "is_superuser"] and user.is_superuser and not updated_by.is_superuser:
                    raise PermissionError("Only superusers can change a superuser role.")
                if field == "is_active" and data[field] is False:
                    if user.is_superuser:
                        raise PermissionError("Cannot deactivate a superuser.")
                    if user.pk == updated_by.pk:
                        raise PermissionError("Cannot deactivate yourself.")
                before[field] = getattr(user, field)
                setattr(user, field, data[field])
                changes[field] = data[field]

        user.save()
        if changes and updated_by.is_admin:
            def _normalize(v):
                if v is None:
                    return None
                if hasattr(v, "isoformat"):
                    return v.isoformat()
                return v

            AdminAuditService.record(
                action="update_user",
                actor=updated_by,
                target=user,
                metadata={
                    "changes": {k: {"from": _normalize(before.get(k)), "to": _normalize(changes.get(k))} for k in changes.keys()},
                },
                ip_address=ip_address,
                user_agent=user_agent,
            )
        return user

    @classmethod
    @transaction.atomic
    def change_user_groups(
        cls,
        user: User,
        group_names: list,
        modified_by: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """Change user's groups."""
        if not modified_by.is_admin:
            raise PermissionError("Only admins can modify user groups.")

        if user.is_superuser and not modified_by.is_superuser:
            raise PermissionError("Only superusers can modify superuser groups.")

        groups = list(Group.objects.filter(name__in=group_names))
        found_names = {g.name for g in groups}
        missing = [n for n in group_names if n not in found_names]
        if missing:
            raise ValueError(f"Unknown groups: {', '.join(missing)}")

        before_groups = list(user.groups.values_list("name", flat=True))
        user.groups.set(groups)
        after_groups = sorted([g.name for g in groups])
        AdminAuditService.record(
            action="change_groups",
            actor=modified_by,
            target=user,
            metadata={"from": sorted(before_groups), "to": after_groups},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return user

    @classmethod
    @transaction.atomic
    def reset_password(
        cls,
        user: User,
        new_password: str,
        reset_by: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """Reset user password (admin action)."""
        if not reset_by.is_admin:
            raise PermissionError("Only admins can reset passwords.")

        password = CustomValidators.validate_password(new_password)
        user.set_password(password)
        user.last_password_change = timezone.now()
        user.save(update_fields=["password", "last_password_change"])
        AdminAuditService.record(
            action="reset_password",
            actor=reset_by,
            target=user,
            metadata={},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return user


class UserProfileService:
    """Service for user profile operations."""

    @classmethod
    def get_profile(cls, user: User) -> dict:
        """Get user profile with additional info."""
        return {
            "id": str(user.id),
            "uuid": str(user.uuid),
            "email": user.email,
            "username": user.username,
            "display_name": user.display_name,
            "birth_date": user.birth_date,
            "gender": user.gender,
            "is_verified": user.is_verified,
            "date_joined": user.date_joined,
            "last_login": user.last_login,
            "groups": [g.name for g in user.groups.all()],
            "permissions": list(user.get_all_permissions()),
        }

    @classmethod
    @transaction.atomic
    def update_own_profile(
        cls,
        user: User,
        data: dict,
    ) -> User:
        """Update own profile (limited fields)."""
        allowed_fields = ["display_name", "birth_date", "gender"]

        for field in allowed_fields:
            if field in data:
                if field == "birth_date" and data[field]:
                    data[field] = CustomValidators.validate_birth_date(data[field])
                setattr(user, field, data[field])

        user.save()
        return user

    @classmethod
    @transaction.atomic
    def change_own_password(
        cls,
        user: User,
        current_password: str,
        new_password: str,
    ) -> User:
        """Change own password."""
        if not user.check_password(current_password):
            raise ValueError("Current password is incorrect.")

        new_password = CustomValidators.validate_password(new_password)
        user.set_password(new_password)
        user.last_password_change = timezone.now()
        user.save(update_fields=["password", "last_password_change"])
        return user


class UserQueryService:
    """Service for querying users (read operations)."""

    @classmethod
    def get_user_by_id(cls, user_id: uuid.UUID) -> Optional[User]:
        return User.objects.filter(id=user_id).first()

    @classmethod
    def get_user_by_uuid(cls, uuid: str) -> Optional[User]:
        try:
            return User.objects.filter(uuid=uuid).first()
        except (ValueError, AttributeError):
            return None

    @classmethod
    def get_all_users(cls, page: int = 1, page_size: int = 20):
        offset = (page - 1) * page_size
        return User.objects.all()[offset:offset + page_size]

    @classmethod
    def search_users(cls, query: str, page: int = 1, page_size: int = 20):
        offset = (page - 1) * page_size
        return User.objects.filter(
            email__icontains=query
        ) | User.objects.filter(
            username__icontains=query
        ) | User.objects.filter(
            display_name__icontains=query
        )[offset:offset + page_size]

    @classmethod
    def get_banned_users(cls, page: int = 1, page_size: int = 20):
        offset = (page - 1) * page_size
        return User.objects.get_banned()[offset:offset + page_size]

    @classmethod
    def get_active_users(cls, page: int = 1, page_size: int = 20):
        offset = (page - 1) * page_size
        return User.objects.get_active()[offset:offset + page_size]
