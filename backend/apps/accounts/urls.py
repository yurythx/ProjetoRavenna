"""
URL routes for accounts app.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from apps.accounts.views import (
    AdminAuditEventViewSet,
    AdminDiagnosticsView,
    ChangePasswordView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    ResendEmailVerificationView,
    SMTPHealthView,
    SMTPSettingsView,
    SMTPTestEmailView,
    UnityTokenView,
    UserViewSet,
    VerifyEmailView,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"audit-events", AdminAuditEventViewSet, basename="admin-audit-event")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("email/verify/", VerifyEmailView.as_view(), name="email_verify"),
    path("email/verify/resend/", ResendEmailVerificationView.as_view(), name="email_verify_resend"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("me/", MeView.as_view(), name="me"),
    path("smtp-settings/", SMTPSettingsView.as_view(), name="smtp_settings"),
    path("smtp-settings/health/", SMTPHealthView.as_view(), name="smtp_settings_health"),
    path("smtp-settings/test/", SMTPTestEmailView.as_view(), name="smtp_settings_test"),
    path("admin/diagnostics/", AdminDiagnosticsView.as_view(), name="admin_diagnostics"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("unity-token/", UnityTokenView.as_view(), name="unity_token"),
    path("", include(router.urls)),
]
