from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

class CustomJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that degrades to AnonymousUser
    instead of raising 401 if the token is invalid.
    This allows public endpoints (AllowAny) to work even if
    the client sends an expired/invalid token.
    """
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, AuthenticationFailed):
            # If token is invalid, raise error to inform the client
            # instead of failing silently as anonymous.
            # This helps the frontend know when to refresh tokens.
            raise InvalidToken()
