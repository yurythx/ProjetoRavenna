import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from apps.accounts.managers import UserManager


class User(AbstractUser):
    """Custom User model with UUID primary key and game-specific fields."""

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        NOT_SPECIFIED = "not_specified", "Not Specified"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    email = models.EmailField(unique=True, db_index=True)
    display_name = models.CharField(max_length=100, blank=True)

    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        default=Gender.NOT_SPECIFIED,
    )

    hwid = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Hardware ID",
    )

    is_banned = models.BooleanField(default=False, db_index=True)
    ban_reason = models.TextField(blank=True)
    banned_at = models.DateTimeField(null=True, blank=True)
    banned_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="banned_users",
    )

    is_verified = models.BooleanField(default=False, db_index=True)
    verification_token = models.CharField(max_length=255, blank=True)
    verification_token_created_at = models.DateTimeField(null=True, blank=True)

    last_password_change = models.DateTimeField(null=True, blank=True)

    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    registration_ip = models.GenericIPAddressField(null=True, blank=True)

    objects = UserManager()
    all_objects = models.Manager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["uuid"]),
            models.Index(fields=["is_banned", "is_active"]),
            models.Index(fields=["is_verified"]),
        ]

    def __str__(self):
        return self.display_name or self.email

    def save(self, *args, **kwargs):
        if not self.display_name:
            self.display_name = self.username
        super().save(*args, **kwargs)

    @property
    def is_active_and_not_banned(self):
        return self.is_active and not self.is_banned

    @property
    def is_player(self):
        return self.groups.filter(name="players").exists()

    @property
    def is_blog_editor(self):
        return self.groups.filter(name="blog_editors").exists()

    @property
    def is_forum_moderator(self):
        return self.groups.filter(name="forum_moderators").exists()

    @property
    def is_admin(self):
        return self.is_staff or self.is_superuser

    def ban(self, reason: str, banned_by: "User" = None):
        self.is_banned = True
        self.is_active = False
        self.ban_reason = reason
        self.banned_at = timezone.now()
        self.banned_by = banned_by
        self.save(update_fields=[
            "is_banned", "is_active", "ban_reason", "banned_at", "banned_by"
        ])

    def unban(self):
        self.is_banned = False
        self.is_active = True
        self.ban_reason = ""
        self.banned_at = None
        self.banned_by = None
        self.save(update_fields=[
            "is_banned", "is_active", "ban_reason", "banned_at", "banned_by"
        ])

    def verify(self):
        self.is_verified = True
        self.verification_token = ""
        if not self.is_banned:
            self.is_active = True
            self.save(update_fields=["is_verified", "verification_token", "is_active"])
        else:
            self.save(update_fields=["is_verified", "verification_token"])

    def get_all_permissions(self, obj=None):
        return super().get_all_permissions(obj)


class AdminAuditEvent(models.Model):
    class Action(models.TextChoices):
        CREATE_USER = "create_user", "Create User"
        REGISTER_USER = "register_user", "Register User"
        EMAIL_VERIFY_SENT = "email_verify_sent", "Email Verify Sent"
        EMAIL_VERIFIED = "email_verified", "Email Verified"
        PASSWORD_RESET_SENT = "password_reset_sent", "Password Reset Sent"
        PASSWORD_RESET_CONFIRMED = "password_reset_confirmed", "Password Reset Confirmed"
        ACTIVATE = "activate", "Activate"
        DEACTIVATE = "deactivate", "Deactivate"
        BAN = "ban", "Ban"
        UNBAN = "unban", "Unban"
        RESET_PASSWORD = "reset_password", "Reset Password"
        CHANGE_GROUPS = "change_groups", "Change Groups"
        UPDATE_USER = "update_user", "Update User"
        UNITY_TOKEN_ISSUED = "unity_token_issued", "Unity Token Issued"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    actor = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="admin_audit_actor_events",
    )
    target = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="admin_audit_target_events",
    )

    action = models.CharField(max_length=32, choices=Action.choices, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = "accounts_admin_audit_events"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["target", "-created_at"]),
            models.Index(fields=["actor", "-created_at"]),
            models.Index(fields=["action", "-created_at"]),
        ]


class SMTPSettings(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    is_enabled = models.BooleanField(default=False)

    host = models.CharField(max_length=255, blank=True)
    port = models.PositiveIntegerField(default=587)
    username = models.CharField(max_length=255, blank=True)
    password_encrypted = models.TextField(blank=True)

    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    timeout = models.PositiveIntegerField(default=10)

    from_email = models.EmailField(blank=True)
    from_name = models.CharField(max_length=255, blank=True)
    reply_to = models.EmailField(blank=True)

    class Meta:
        db_table = "accounts_smtp_settings"


class EmailOneTimeCode(models.Model):
    class Purpose(models.TextChoices):
        EMAIL_VERIFY = "email_verify", "Email Verify"
        PASSWORD_RESET = "password_reset", "Password Reset"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    consumed_at = models.DateTimeField(null=True, blank=True, db_index=True)

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="one_time_codes")
    purpose = models.CharField(max_length=32, choices=Purpose.choices, db_index=True)
    code_hash = models.CharField(max_length=255)
    attempts = models.PositiveIntegerField(default=0)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = "accounts_email_one_time_codes"
        indexes = [
            models.Index(fields=["user", "purpose", "-created_at"]),
            models.Index(fields=["purpose", "expires_at"]),
            models.Index(fields=["ip_address", "purpose", "-created_at"]),
        ]
