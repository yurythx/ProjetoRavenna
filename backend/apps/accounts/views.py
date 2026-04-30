from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import AdminAuditEvent
from apps.accounts.permissions import (
    IsAdminOrReadOnly,
    IsNotBanned,
    IsOwnerOrAdmin,
)
from apps.accounts.serializers import (
    AdminAuditEventSerializer,
    BanUserSerializer,
    ChangePasswordSerializer,
    EmailResendSerializer,
    EmailVerifySerializer,
    PasswordResetRequestSerializer,
    PasswordResetCodeConfirmSerializer,
    PasswordResetCodeRequestSerializer,
    ResetPasswordSerializer,
    SMTPSettingsSerializer,
    SMTPTestEmailSerializer,
    SetNewPasswordSerializer,
    UserAdminCreateSerializer,
    UserAdminSerializer,
    UserListSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    UserRegistrationSerializer,
    UserUUIDSerializer,
)

User = get_user_model()


class StandardPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 200


class RegisterView(APIView):
    """User registration endpoint."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "otp"

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            user = serializer.save()
            from apps.accounts.emailing import OneTimeCodeService, send_email

            xff = request.META.get("HTTP_X_FORWARDED_FOR") or ""
            ip_address = xff.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT", "")
            expires_minutes = getattr(settings, "ACCOUNTS_EMAIL_VERIFY_CODE_EXPIRES_MINUTES", 10)
            try:
                code = OneTimeCodeService.issue(
                    user=user,
                    purpose="email_verify",
                    expires_in_minutes=expires_minutes,
                    cooldown_seconds=getattr(settings, "ACCOUNTS_OTP_COOLDOWN_SECONDS", 60),
                    max_per_hour=getattr(settings, "ACCOUNTS_OTP_MAX_PER_HOUR", 10),
                    max_per_hour_per_ip=getattr(settings, "ACCOUNTS_OTP_MAX_PER_HOUR_PER_IP", 50),
                    ip_address=ip_address or None,
                    user_agent=user_agent or "",
                )
                body = render_to_string(
                    "emails/email_verify_code.txt",
                    {"code": code, "expires_minutes": expires_minutes},
                )
                html_body = render_to_string(
                    "emails/email_verify_code.html",
                    {"code": code, "expires_minutes": expires_minutes},
                )
                send_email(
                    to_email=user.email,
                    subject="Confirme seu e-mail",
                    body=body,
                    html_body=html_body,
                )
                from apps.accounts.services import AdminAuditService

                AdminAuditService.record(
                    action="email_verify_sent",
                    actor=None,
                    target=user,
                    metadata={"resend": False},
                    ip_address=ip_address or None,
                    user_agent=user_agent or "",
                )
            except Exception:
                pass

            return Response({"verification_required": True, "email": user.email}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def post(self, request):
        serializer = EmailVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_verified:
            return Response({"detail": "Email already verified."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.accounts.emailing import OneTimeCodeService

        ok = OneTimeCodeService.verify(
            user=user,
            purpose="email_verify",
            code=code,
            max_attempts=getattr(settings, "ACCOUNTS_OTP_MAX_ATTEMPTS", 10),
        )
        if not ok:
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)

        user.verify()
        try:
            xff = request.META.get("HTTP_X_FORWARDED_FOR") or ""
            ip_address = xff.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT", "")
            from apps.accounts.services import AdminAuditService

            AdminAuditService.record(
                action="email_verified",
                actor=user,
                target=user,
                metadata={},
                ip_address=ip_address or None,
                user_agent=user_agent or "",
            )
        except Exception:
            pass
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserProfileSerializer(user).data,
                "tokens": {"refresh": str(refresh), "access": str(refresh.access_token)},
            },
            status=status.HTTP_200_OK,
        )


class ResendEmailVerificationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "otp"

    def post(self, request):
        serializer = EmailResendSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        if not user or user.is_verified:
            return Response({"detail": "OK"}, status=status.HTTP_200_OK)

        from apps.accounts.emailing import OneTimeCodeService, send_email

        xff = request.META.get("HTTP_X_FORWARDED_FOR") or ""
        ip_address = xff.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        expires_minutes = getattr(settings, "ACCOUNTS_EMAIL_VERIFY_CODE_EXPIRES_MINUTES", 10)
        try:
            code = OneTimeCodeService.issue(
                user=user,
                purpose="email_verify",
                expires_in_minutes=expires_minutes,
                cooldown_seconds=getattr(settings, "ACCOUNTS_OTP_COOLDOWN_SECONDS", 60),
                max_per_hour=getattr(settings, "ACCOUNTS_OTP_MAX_PER_HOUR", 10),
                max_per_hour_per_ip=getattr(settings, "ACCOUNTS_OTP_MAX_PER_HOUR_PER_IP", 50),
                ip_address=ip_address or None,
                user_agent=user_agent or "",
            )
            body = render_to_string(
                "emails/email_verify_code.txt",
                {"code": code, "expires_minutes": expires_minutes},
            )
            html_body = render_to_string(
                "emails/email_verify_code.html",
                {"code": code, "expires_minutes": expires_minutes},
            )
            send_email(
                to_email=user.email,
                subject="Confirme seu e-mail",
                body=body,
                html_body=html_body,
            )
            from apps.accounts.services import AdminAuditService

            AdminAuditService.record(
                action="email_verify_sent",
                actor=None,
                target=user,
                metadata={"resend": True},
                ip_address=ip_address or None,
                user_agent=user_agent or "",
            )
        except Exception:
            pass
        return Response({"detail": "OK"}, status=status.HTTP_200_OK)


class LoginView(APIView):
    """User login endpoint with JWT."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR") or ""
        ip_address = xff.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
        serializer = UserLoginSerializer(data=request.data, context={"ip_address": ip_address or None})
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "user": UserProfileSerializer(user).data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """User logout endpoint."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {"message": "Successfully logged out."},
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {"error": "Invalid token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProfileView(APIView):
    """User profile endpoint (GET/PUT own profile)."""

    permission_classes = [IsAuthenticated, IsNotBanned]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserProfileSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Change own password endpoint."""

    permission_classes = [IsAuthenticated, IsNotBanned]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            from apps.accounts.services import UserProfileService

            try:
                UserProfileService.change_own_password(
                    user=request.user,
                    current_password=serializer.validated_data["current_password"],
                    new_password=serializer.validated_data["new_password"],
                )
                return Response(
                    {"message": "Password changed successfully."},
                    status=status.HTTP_200_OK,
                )
            except ValueError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """Request password reset email."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle, ScopedRateThrottle]
    throttle_scope = "otp"

    def post(self, request):
        serializer = PasswordResetCodeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        if user and not user.is_banned:
            from apps.accounts.emailing import OneTimeCodeService, send_email

            xff = request.META.get("HTTP_X_FORWARDED_FOR") or ""
            ip_address = xff.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT", "")
            expires_minutes = getattr(settings, "ACCOUNTS_PASSWORD_RESET_CODE_EXPIRES_MINUTES", 10)
            try:
                code = OneTimeCodeService.issue(
                    user=user,
                    purpose="password_reset",
                    expires_in_minutes=expires_minutes,
                    cooldown_seconds=getattr(settings, "ACCOUNTS_OTP_COOLDOWN_SECONDS", 60),
                    max_per_hour=getattr(settings, "ACCOUNTS_OTP_MAX_PER_HOUR", 10),
                    max_per_hour_per_ip=getattr(settings, "ACCOUNTS_OTP_MAX_PER_HOUR_PER_IP", 50),
                    ip_address=ip_address or None,
                    user_agent=user_agent or "",
                )
                body = render_to_string(
                    "emails/password_reset_code.txt",
                    {"code": code, "expires_minutes": expires_minutes},
                )
                html_body = render_to_string(
                    "emails/password_reset_code.html",
                    {"code": code, "expires_minutes": expires_minutes},
                )
                send_email(
                    to_email=user.email,
                    subject="Recuperação de senha",
                    body=body,
                    html_body=html_body,
                )
                from apps.accounts.services import AdminAuditService

                AdminAuditService.record(
                    action="password_reset_sent",
                    actor=None,
                    target=user,
                    metadata={},
                    ip_address=ip_address or None,
                    user_agent=user_agent or "",
                )
            except Exception:
                pass

        return Response({"detail": "OK"}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """Confirm password reset with token."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def post(self, request):
        serializer = PasswordResetCodeConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]
        new_password = serializer.validated_data["new_password"]

        user = User.objects.filter(email__iexact=email).first()
        if not user or user.is_banned:
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.accounts.emailing import OneTimeCodeService

        ok = OneTimeCodeService.verify(
            user=user,
            purpose="password_reset",
            code=code,
            max_attempts=getattr(settings, "ACCOUNTS_OTP_MAX_ATTEMPTS", 10),
        )
        if not ok:
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.last_password_change = timezone.now()
        user.save(update_fields=["password", "last_password_change"])
        try:
            xff = request.META.get("HTTP_X_FORWARDED_FOR") or ""
            ip_address = xff.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT", "")
            from apps.accounts.services import AdminAuditService

            AdminAuditService.record(
                action="password_reset_confirmed",
                actor=user,
                target=user,
                metadata={},
                ip_address=ip_address or None,
                user_agent=user_agent or "",
            )
        except Exception:
            pass
        return Response({"detail": "OK"}, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """Admin viewset for user management."""

    queryset = User.objects.all()
    permission_classes = [IsAdminUser]
    serializer_class = UserAdminSerializer
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.action == "list":
            return UserListSerializer
        if self.action == "create":
            return UserAdminCreateSerializer
        return UserAdminSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAdminUser()]
        return [IsAdminUser()]

    def _apply_filters(self, qs):
        params = self.request.query_params

        query = (params.get("q") or params.get("search") or "").strip()
        if query:
            qs = qs.filter(
                Q(email__icontains=query)
                | Q(username__icontains=query)
                | Q(display_name__icontains=query)
            )

        is_active = params.get("is_active")
        if is_active in ["true", "false"]:
            qs = qs.filter(is_active=(is_active == "true"))

        is_banned = params.get("is_banned")
        if is_banned in ["true", "false"]:
            qs = qs.filter(is_banned=(is_banned == "true"))

        is_staff = params.get("is_staff")
        if is_staff in ["true", "false"]:
            qs = qs.filter(is_staff=(is_staff == "true"))

        group = (params.get("group") or "").strip()
        if group:
            qs = qs.filter(groups__name=group)

        ordering = params.get("ordering")
        if ordering:
            allowed = {"date_joined", "last_login", "email", "username", "is_active", "is_banned", "is_staff", "is_superuser"}
            fields = []
            for part in str(ordering).split(","):
                p = part.strip()
                if not p:
                    continue
                key = p[1:] if p.startswith("-") else p
                if key in allowed:
                    fields.append(p)
            if fields:
                qs = qs.order_by(*fields)

        return qs.distinct()

    def get_queryset(self):
        qs = User.objects.all().prefetch_related("groups")
        if self.action in ["list", "search", "banned"]:
            return self._apply_filters(qs)
        return qs

    @action(detail=True, methods=["post"])
    def ban(self, request, pk=None):
        """Ban a user."""
        user = self.get_object()
        if user.id == request.user.id:
            return Response({"error": "Cannot ban yourself."}, status=status.HTTP_403_FORBIDDEN)
        serializer = BanUserSerializer(data=request.data)

        if serializer.is_valid():
            from apps.accounts.services import UserManagementService

            try:
                ip = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")
                ua = request.META.get("HTTP_USER_AGENT", "")
                UserManagementService.ban_user(
                    user=user,
                    reason=serializer.validated_data["reason"],
                    banned_by=request.user,
                    ip_address=ip,
                    user_agent=ua,
                )
                return Response(
                    {"message": f"User {user.username} has been banned."},
                    status=status.HTTP_200_OK,
                )
            except (PermissionError, ValueError) as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def unban(self, request, pk=None):
        """Unban a user."""
        user = self.get_object()

        from apps.accounts.services import UserManagementService

        try:
            ip = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")
            ua = request.META.get("HTTP_USER_AGENT", "")
            UserManagementService.unban_user(user=user, unbanned_by=request.user, ip_address=ip, user_agent=ua)
            return Response(
                {"message": f"User {user.username} has been unbanned."},
                status=status.HTTP_200_OK,
            )
        except PermissionError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN,
            )

    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        """Reset user password (admin action)."""
        user = self.get_object()
        if user.id == request.user.id:
            return Response({"error": "Cannot reset your own password here."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ResetPasswordSerializer(data=request.data)

        if serializer.is_valid():
            from apps.accounts.services import UserManagementService

            try:
                UserManagementService.reset_password(
                    user=user,
                    new_password=serializer.validated_data["new_password"],
                    reset_by=request.user,
                    ip_address=(request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip() or request.META.get("REMOTE_ADDR"),
                    user_agent=request.META.get("HTTP_USER_AGENT", ""),
                )
                return Response(
                    {"message": f"Password for {user.username} has been reset."},
                    status=status.HTTP_200_OK,
                )
            except PermissionError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """Activate a user account."""
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        from apps.accounts.services import AdminAuditService

        AdminAuditService.record(
            action="activate",
            actor=request.user,
            target=user,
            metadata={},
            ip_address=(request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip() or request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response(
            {"message": f"User {user.username} has been activated."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """Deactivate a user account."""
        user = self.get_object()
        if user.id == request.user.id:
            return Response(
                {"error": "Cannot deactivate yourself."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if user.is_superuser:
            return Response(
                {"error": "Cannot deactivate a superuser."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user.is_active = False
        user.save(update_fields=["is_active"])
        from apps.accounts.services import AdminAuditService

        AdminAuditService.record(
            action="deactivate",
            actor=request.user,
            target=user,
            metadata={},
            ip_address=(request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip() or request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response(
            {"message": f"User {user.username} has been deactivated."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def search(self, request):
        """Search users by email, username, or display name."""
        query = request.query_params.get("q", "")
        if not query:
            return Response(
                {"error": "Query parameter 'q' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        users = self._apply_filters(User.objects.all().prefetch_related("groups"))

        page = self.paginate_queryset(users)
        if page is not None:
            serializer = UserListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = UserListSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def banned(self, request):
        """List all banned users."""
        users = self._apply_filters(User.objects.get_banned().prefetch_related("groups"))
        page = self.paginate_queryset(users)
        if page is not None:
            serializer = UserListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = UserListSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def groups(self, request):
        """List available groups (admin UI helper)."""
        names = list(Group.objects.exclude(name="admins").order_by("name").values_list("name", flat=True))
        return Response({"results": names})


class MeView(APIView):
    """Current user info endpoint."""

    permission_classes = [IsAuthenticated, IsNotBanned]

    def get(self, request):
        return Response({
            "id": str(request.user.id),
            "uuid": str(request.user.uuid),
            "email": request.user.email,
            "username": request.user.username,
            "display_name": request.user.display_name,
            "groups": [g.name for g in request.user.groups.all()],
            "is_active": bool(request.user.is_active),
            "is_banned": bool(request.user.is_banned),
            "is_verified": bool(request.user.is_verified),
            "is_admin": request.user.is_admin,
            "is_staff": request.user.is_staff,
            "is_superuser": request.user.is_superuser,
            "is_player": request.user.is_player,
            "is_blog_editor": request.user.is_blog_editor,
            "is_forum_moderator": request.user.is_forum_moderator,
        })


class SMTPSettingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.accounts.models import SMTPSettings

        cfg = SMTPSettings.objects.order_by("-updated_at").first()
        if not cfg:
            cfg = SMTPSettings.objects.create()
        return Response(SMTPSettingsSerializer(cfg).data)

    def put(self, request):
        from apps.accounts.models import SMTPSettings

        cfg = SMTPSettings.objects.order_by("-updated_at").first()
        if not cfg:
            cfg = SMTPSettings.objects.create()
        serializer = SMTPSettingsSerializer(cfg, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        cfg = serializer.save()
        return Response(SMTPSettingsSerializer(cfg).data)


class SMTPTestEmailView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = SMTPTestEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        to_email = serializer.validated_data["to_email"]
        from apps.accounts.emailing import send_email

        send_email(
            to_email=to_email,
            subject="Teste de SMTP",
            body="Este é um e-mail de teste do Projeto Ravenna.",
        )
        return Response({"detail": "OK"}, status=status.HTTP_200_OK)


class SMTPHealthView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.core.mail import get_connection
        from django.core.cache import caches
        from django.db import connections
        from apps.accounts.models import SMTPSettings

        cfg = SMTPSettings.objects.order_by("-updated_at").first()
        if not cfg or not cfg.is_enabled or not cfg.host:
            return Response({"status": "disabled"}, status=status.HTTP_200_OK)

        try:
            conn = get_connection()
            conn.open()
            conn.close()
            return Response({"status": "ok"}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"status": "degraded"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class AdminDiagnosticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.conf import settings
        from apps.accounts.models import SMTPSettings

        db_ok = True
        cache_ok = True
        smtp_cfg = SMTPSettings.objects.order_by("-updated_at").first()

        try:
            connections["default"].ensure_connection()
        except Exception:
            db_ok = False

        try:
            cache = caches["default"]
            cache.set("__diag__", "1", timeout=2)
            cache_ok = cache.get("__diag__") == "1"
        except Exception:
            cache_ok = False

        smtp_enabled = bool(smtp_cfg and smtp_cfg.is_enabled and smtp_cfg.host)
        smtp_password_set = bool(smtp_cfg and smtp_cfg.password_encrypted)

        warnings = []
        if not settings.DEBUG and not getattr(settings, "REDIS_URL", "").strip():
            warnings.append("REDIS_URL não configurado em produção; throttling/cache não serão distribuídos entre réplicas.")
        if getattr(settings, "EMAIL_SETTINGS_ENCRYPTION_SALT", "") in ["change-me-email-salt", ""]:
            warnings.append("EMAIL_SETTINGS_ENCRYPTION_SALT está usando valor padrão/vazio; defina um valor forte em produção.")
        if smtp_enabled and not (smtp_cfg and smtp_cfg.from_email):
            warnings.append("SMTP ativo sem from_email configurado.")
        if smtp_enabled and not smtp_password_set and (smtp_cfg and smtp_cfg.username):
            warnings.append("SMTP ativo com username, mas sem senha configurada.")

        return Response(
            {
                "status": "ok" if (db_ok and cache_ok) else "degraded",
                "app": {
                    "version": getattr(settings, "APP_VERSION", ""),
                    "build_sha": getattr(settings, "APP_BUILD_SHA", ""),
                    "build_time": getattr(settings, "APP_BUILD_TIME", ""),
                    "debug": bool(settings.DEBUG),
                },
                "db": {"ok": db_ok},
                "cache": {"ok": cache_ok, "backend": getattr(settings, "CACHES", {}).get("default", {}).get("BACKEND", "")},
                "redis": {"configured": bool(getattr(settings, "REDIS_URL", "").strip())},
                "email": {"backend": getattr(settings, "EMAIL_BACKEND", ""), "from": getattr(settings, "DEFAULT_FROM_EMAIL", "")},
                "smtp": {
                    "enabled": smtp_enabled,
                    "host": smtp_cfg.host if smtp_cfg else "",
                    "port": int(smtp_cfg.port) if smtp_cfg else None,
                    "username": smtp_cfg.username if smtp_cfg else "",
                    "use_tls": bool(smtp_cfg.use_tls) if smtp_cfg else False,
                    "use_ssl": bool(smtp_cfg.use_ssl) if smtp_cfg else False,
                    "timeout": int(smtp_cfg.timeout) if smtp_cfg else None,
                    "from_email": smtp_cfg.from_email if smtp_cfg else "",
                    "from_name": smtp_cfg.from_name if smtp_cfg else "",
                    "reply_to": smtp_cfg.reply_to if smtp_cfg else "",
                    "password_set": smtp_password_set,
                },
                "otp": {
                    "email_verify_expires_minutes": int(getattr(settings, "ACCOUNTS_EMAIL_VERIFY_CODE_EXPIRES_MINUTES", 10)),
                    "password_reset_expires_minutes": int(getattr(settings, "ACCOUNTS_PASSWORD_RESET_CODE_EXPIRES_MINUTES", 10)),
                    "max_attempts": int(getattr(settings, "ACCOUNTS_OTP_MAX_ATTEMPTS", 10)),
                    "cooldown_seconds": int(getattr(settings, "ACCOUNTS_OTP_COOLDOWN_SECONDS", 60)),
                    "max_per_hour_user": int(getattr(settings, "ACCOUNTS_OTP_MAX_PER_HOUR", 10)),
                    "max_per_hour_ip": int(getattr(settings, "ACCOUNTS_OTP_MAX_PER_HOUR_PER_IP", 50)),
                    "cleanup_after_days": int(getattr(settings, "ACCOUNTS_OTP_CLEANUP_AFTER_DAYS", 7)),
                    "throttle_rate": getattr(settings, "REST_FRAMEWORK", {}).get("DEFAULT_THROTTLE_RATES", {}).get("otp"),
                },
                "warnings": warnings,
            },
            status=status.HTTP_200_OK if (db_ok and cache_ok) else status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class UnityTokenView(APIView):
    """
    Generate a short-lived JWT for the Unity game client via deep link auth.

    POST /api/v1/accounts/unity-token/
    Body: {"client_id": "<uuid-generated-by-unity>"}

    Returns:
        {"deep_link": "ravenna-game://auth?token=<jwt>&expires=<iso>", "token": "<jwt>", "expires_at": "<iso>"}

    The returned JWT:
    - Algorithm: RS256 (same key pair as the main JWT)
    - Lifetime: 5 minutes
    - Extra claims: client_id, token_type=unity_auth
    - Can be verified client-side by Unity using the RSA public key (no backend call needed)
    """

    permission_classes = [IsAuthenticated, IsNotBanned]

    def post(self, request):
        from datetime import timedelta
        from django.utils import timezone
        from rest_framework_simplejwt.tokens import AccessToken

        client_id = (request.data.get("client_id") or "").strip()
        if not client_id:
            return Response({"error": "client_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        token = AccessToken.for_user(request.user)
        token.set_exp(lifetime=timedelta(minutes=5))
        token["token_type"] = "unity_auth"
        token["client_id"] = client_id
        token["display_name"] = request.user.display_name

        jwt_str = str(token)
        expires_at = timezone.now() + timedelta(minutes=5)
        deep_link = f"ravenna-game://auth?token={jwt_str}&expires={expires_at.isoformat()}"

        return Response(
            {
                "deep_link": deep_link,
                "token": jwt_str,
                "expires_at": expires_at.isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class AdminAuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AdminAuditEvent.objects.select_related("actor", "target").all()
    permission_classes = [IsAdminUser]
    serializer_class = AdminAuditEventSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        query = (params.get("q") or params.get("search") or "").strip()
        if query:
            qs = qs.filter(
                Q(actor__email__icontains=query)
                | Q(actor__username__icontains=query)
                | Q(actor__display_name__icontains=query)
                | Q(target__email__icontains=query)
                | Q(target__username__icontains=query)
                | Q(target__display_name__icontains=query)
            )

        target = params.get("target")
        if target:
            qs = qs.filter(target_id=target)

        actor = params.get("actor")
        if actor:
            qs = qs.filter(actor_id=actor)

        action = params.get("action")
        if action:
            qs = qs.filter(action=action)

        ordering = params.get("ordering")
        if ordering:
            allowed = {"created_at", "action"}
            fields = []
            for part in str(ordering).split(","):
                p = part.strip()
                if not p:
                    continue
                key = p[1:] if p.startswith("-") else p
                if key in allowed:
                    fields.append(p)
            if fields:
                qs = qs.order_by(*fields)

        return qs
