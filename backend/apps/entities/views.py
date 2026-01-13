from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from django.core.cache import cache
from .models import Entity
from .serializers import EntityConfigSerializer

ENTITY_CONFIG_CACHE_KEY = 'entity_config_{domain}'
ENTITY_CONFIG_CACHE_TIMEOUT = 300  # 5 minutes

class EntityConfigView(APIView):
    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAdminUser()]
        return [AllowAny()]

    def get(self, request):
        host = request.get_host().split(':')[0]  # Remove port if present
        
        # Check cache first
        cache_key = ENTITY_CONFIG_CACHE_KEY.format(domain=host)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        # Try to find entity by domain
        entity = Entity.objects.filter(domain=host, is_active=True).first()
        
        # Fallback for development (optional: allow getting the first one if no domain matches)
        if not entity and (host == 'localhost' or host == '127.0.0.1'):
             entity = Entity.objects.filter(is_active=True).first()

        if not entity:
            return Response({"detail": "Entity not found for this domain."}, status=404)

        serializer = EntityConfigSerializer(entity, context={'request': request})
        
        # Cache the result
        cache.set(cache_key, serializer.data, ENTITY_CONFIG_CACHE_TIMEOUT)
        
        return Response(serializer.data)

    def patch(self, request):
        """Update entity branding (admin only)"""
        host = request.get_host().split(':')[0]
        
        # Find entity by domain
        entity = Entity.objects.filter(domain=host, is_active=True).first()
        
        # Fallback for development
        if not entity and (host == 'localhost' or host == '127.0.0.1'):
            entity = Entity.objects.filter(is_active=True).first()

        if not entity:
            return Response({"detail": "Entity not found for this domain."}, status=404)

        serializer = EntityConfigSerializer(entity, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            
            # Invalidate cache after update
            cache_key = ENTITY_CONFIG_CACHE_KEY.format(domain=host)
            cache.delete(cache_key)
            
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
