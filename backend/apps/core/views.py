from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.db import connection
from django.conf import settings

# Create your views here.

@require_GET
def health_check(request):
    """
    Health check endpoint for Docker and monitoring systems.
    Returns 200 if all systems are healthy, 503 otherwise.
    """
    try:
        # Test database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        # Basic health status
        status = {
            "status": "healthy",
            "database": "connected",
            "debug": settings.DEBUG,
        }
        
        # Optionally check MinIO if configured
        if hasattr(settings, 'USE_MINIO') and settings.USE_MINIO:
            status["storage"] = "minio_configured"
        else:
            status["storage"] = "local"
        
        return JsonResponse(status, status=200)
    except Exception as e:
        return JsonResponse({
            "status": "unhealthy",
            "error": str(e)
        }, status=503)
