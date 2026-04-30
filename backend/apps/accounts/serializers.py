from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import serializers

from apps.accounts.models import AdminAuditEvent, SMTPSettings
from apps.accounts.validators import CustomValidators

User = get_user_model()


def _extract_request_ip_user_agent(request):
    if not request:
        return None, None
    xff = request.META.get("HTTP_X_FORWARDED_FOR") or ""
    ip_address = xff.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    return ip_address or None, user_agent or ""


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    birth_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "password",
            "password_confirm",
            "display_name",
            "birth_date",
            "gender",
        ]
        extra_kwargs = {
            "display_name": {"required": False},
            "gender": {"required": False},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        try:
            password = CustomValidators.validate_password(attrs["password"])
        except Exception as e:
            raise serializers.ValidationError({"password": str(e.message) if hasattr(e, "message") else str(e)})

        if "birth_date" in attrs and attrs["birth_date"]:
            try:
                attrs["birth_date"] = CustomValidators.validate_birth_date(attrs["birth_date"])
            except Exception as e:
                raise serializers.ValidationError({"birth_date": str(e)})

        return attrs

    def create(self, validated_data):
        from apps.accounts.services import UserRegistrationService

        password = validated_data.pop("password")
        request = self.context.get("request")
        ip_address, user_agent = _extract_request_ip_user_agent(request)

        user = UserRegistrationService.register_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=password,
            display_name=validated_data.get("display_name"),
            birth_date=validated_data.get("birth_date"),
            gender=validated_data.get("gender"),
            registration_ip=ip_address,
            user_agent=user_agent,
            send_welcome_email=False,
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login."""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )
    hwid = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate(self, attrs):
        from apps.accounts.services import UserAuthenticationService

        raw_email = attrs["email"]
        raw_password = attrs["password"]
        candidate = User.objects.filter(email__iexact=raw_email).first()
        if candidate and candidate.check_password(raw_password):
            if candidate.is_banned:
                raise serializers.ValidationError("Sua conta está banida.")
            if not candidate.is_verified:
                raise serializers.ValidationError("Confirme seu e-mail antes de entrar.")
            if not candidate.is_active:
                raise serializers.ValidationError("Sua conta está desativada.")

        user = UserAuthenticationService.authenticate(
            email=raw_email,
            password=raw_password,
            hwid=attrs.get("hwid"),
            ip_address=self.context.get("ip_address"),
        )

        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        attrs["user"] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile (read-only)."""

    groups = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "uuid",
            "email",
            "username",
            "display_name",
            "birth_date",
            "gender",
            "is_verified",
            "is_banned",
            "date_joined",
            "last_login",
            "groups",
            "permissions",
        ]
        read_only_fields = fields

    def get_groups(self, obj):
        return [g.name for g in obj.groups.all()]

    def get_permissions(self, obj):
        return list(obj.get_all_permissions())


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating own profile."""

    class Meta:
        model = User
        fields = ["display_name", "birth_date", "gender"]

    def validate_birth_date(self, value):
        if value:
            try:
                return CustomValidators.validate_birth_date(value)
            except Exception as e:
                raise serializers.ValidationError(str(e))
        return value

    def update(self, instance, validated_data):
        from apps.accounts.services import UserProfileService

        return UserProfileService.update_own_profile(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing own password."""

    current_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )

        try:
            CustomValidators.validate_password(attrs["new_password"])
        except Exception as e:
            raise serializers.ValidationError({"new_password": str(e)})

        return attrs


class EmailVerifySerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, min_length=6, max_length=6)


class EmailResendSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetCodeRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetCodeConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, min_length=6, max_length=6)
    new_password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})
    new_password_confirm = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        try:
            CustomValidators.validate_password(attrs["new_password"])
        except Exception as e:
            raise serializers.ValidationError({"new_password": str(e)})
        return attrs


class SMTPSettingsSerializer(serializers.ModelSerializer):
    password = serializers.CharField(required=False, write_only=True, allow_blank=True, style={"input_type": "password"})
    password_set = serializers.SerializerMethodField()

    class Meta:
        model = SMTPSettings
        fields = [
            "is_enabled",
            "host",
            "port",
            "username",
            "password",
            "password_set",
            "use_tls",
            "use_ssl",
            "timeout",
            "from_email",
            "from_name",
            "reply_to",
        ]

    def get_password_set(self, obj):
        return bool(obj.password_encrypted)

    def update(self, instance, validated_data):
        from apps.accounts.emailing import encrypt_secret

        password = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password is not None and str(password).strip():
            instance.password_encrypted = encrypt_secret(str(password))
        instance.save()
        return instance


class SMTPTestEmailSerializer(serializers.Serializer):
    to_email = serializers.EmailField(required=True)


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for admin user list."""

    groups = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "uuid",
            "email",
            "username",
            "display_name",
            "is_active",
            "is_banned",
            "is_verified",
            "is_staff",
            "is_superuser",
            "groups",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields

    def get_groups(self, obj):
        return [g.name for g in obj.groups.all()]


class UserAdminCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=True, min_length=3, max_length=150)
    password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})
    display_name = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    is_staff = serializers.BooleanField(required=False)
    groups = serializers.ListField(child=serializers.CharField(), required=False)

    def validate_password(self, value):
        try:
            return CustomValidators.validate_password(value)
        except Exception as e:
            raise serializers.ValidationError(str(e))

    def create(self, validated_data):
        from apps.accounts.services import AdminAuditService, UserManagementService

        request = self.context.get("request")
        ip_address, user_agent = _extract_request_ip_user_agent(request)

        groups = validated_data.pop("groups", None)
        password = validated_data.pop("password")
        display_name = validated_data.pop("display_name", None)
        is_staff = bool(validated_data.pop("is_staff", False))

        user = User.objects.create_user(password=password, **validated_data)
        if display_name is not None:
            user.display_name = display_name
            user.save(update_fields=["display_name"])

        if is_staff:
            user.is_staff = True
            user.save(update_fields=["is_staff"])

        if groups is not None:
            UserManagementService.change_user_groups(
                user,
                groups,
                self.context["request"].user,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        AdminAuditService.record(
            action="create_user",
            actor=self.context["request"].user,
            target=user,
            metadata={},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return user

    def to_representation(self, instance):
        return UserAdminSerializer(instance, context=self.context).data


class UserAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin user management."""

    groups = serializers.SlugRelatedField(
        slug_field="name",
        many=True,
        queryset=Group.objects.all(),
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "uuid",
            "email",
            "username",
            "display_name",
            "is_active",
            "is_banned",
            "is_verified",
            "is_staff",
            "is_superuser",
            "groups",
            "birth_date",
            "gender",
            "ban_reason",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "uuid", "date_joined", "last_login", "ban_reason"]

    def update(self, instance, validated_data):
        from apps.accounts.services import UserManagementService

        request = self.context.get("request")
        ip_address, user_agent = _extract_request_ip_user_agent(request)

        groups_data = validated_data.pop("groups", None)

        if groups_data is not None:
            UserManagementService.change_user_groups(
                instance,
                [g.name for g in groups_data],
                self.context["request"].user,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        return UserManagementService.update_user(
            instance,
            validated_data,
            self.context["request"].user,
            ip_address=ip_address,
            user_agent=user_agent,
        )


class BanUserSerializer(serializers.Serializer):
    """Serializer for banning a user."""

    reason = serializers.CharField(
        required=True,
        min_length=10,
        max_length=1000,
    )

    def validate_reason(self, value):
        try:
            return CustomValidators.validate_ban_reason(value)
        except Exception as e:
            raise serializers.ValidationError(str(e))


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer for admin password reset."""

    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_new_password(self, value):
        try:
            CustomValidators.validate_password(value)
        except Exception as e:
            raise serializers.ValidationError(str(e))
        return value


class AdminAuditEventSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()
    target = serializers.SerializerMethodField()

    class Meta:
        model = AdminAuditEvent
        fields = ["id", "created_at", "action", "actor", "target", "metadata", "ip_address", "user_agent"]
        read_only_fields = fields

    def get_actor(self, obj):
        if not obj.actor_id:
            return None
        a = obj.actor
        return {"id": str(a.id), "email": a.email, "username": a.username, "display_name": a.display_name}

    def get_target(self, obj):
        t = obj.target
        return {"id": str(t.id), "email": t.email, "username": t.username, "display_name": t.display_name}


class UserUUIDSerializer(serializers.Serializer):
    """Serializer for user lookup by UUID."""

    uuid = serializers.UUIDField(required=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""

    email = serializers.EmailField(required=True)


class SetNewPasswordSerializer(serializers.Serializer):
    """Serializer for setting new password after reset."""

    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )

        try:
            CustomValidators.validate_password(attrs["new_password"])
        except Exception as e:
            raise serializers.ValidationError({"new_password": str(e)})

        return attrs
