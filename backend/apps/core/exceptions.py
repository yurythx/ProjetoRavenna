from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging
import traceback

logger = logging.getLogger(__name__)

def standard_exception_handler(exc, context):
    """
    Global exception handler that standardizes the error response format.
    Format:
    {
      "code": "error_code",
      "message": "Friendly description",
      "details": { "field": ["Specific error"] }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        payload = {
            "code": "error",
            "message": "An error occurred",
            "details": {}
        }
        
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                 # DRF validation errors
                 payload["code"] = "validation_error"
                 payload["message"] = "Validation failed"
                 payload["details"] = exc.detail
            elif isinstance(exc.detail, list):
                 payload["details"] = {"global": exc.detail}
                 payload["message"] = exc.detail[0] if exc.detail else "Error"
            else:
                 # Standard API exceptions
                 payload["message"] = str(exc.detail)
                 payload["code"] = exc.default_code if hasattr(exc, 'default_code') else "error"
        elif response.status_code == 404:
             payload["code"] = "not_found"
             payload["message"] = "Not found."
        elif response.status_code == 403:
             payload["code"] = "permission_denied"
             payload["message"] = "Permission denied."
        
        response.data = payload
    else:
        # Handle unhandled exceptions (500 errors)
        logger.error(
            f"Unhandled exception in {context.get('view', 'unknown view')}: {exc}",
            exc_info=True,
            extra={
                'request': context.get('request'),
                'view': context.get('view'),
            }
        )
        
        # Return JSON response instead of HTML
        
        # In production, hide technical details
        from django.conf import settings
        
        error_details = {
            "error_type": exc.__class__.__name__,
        }
        
        if settings.DEBUG:
            error_details["error_message"] = str(exc)
        else:
            error_details["error_message"] = "Internal Error. Please contact administrator."

        response = Response(
            {
                "code": "internal_server_error",
                "message": "An internal server error occurred. Please contact support.",
                "details": error_details
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
