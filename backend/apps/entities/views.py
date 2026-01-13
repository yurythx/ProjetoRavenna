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
        
        # Clean host (remove api. or www. prefixes to find the base domain)
        clean_host = host
        if host.startswith('api.'):
            clean_host = host[4:]
        elif host.startswith('www.'):
            clean_host = host[4:]

        # Check cache first
        cache_key = ENTITY_CONFIG_CACHE_KEY.format(domain=clean_host)
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        # Try to find entity by cleaned domain
        entity = Entity.objects.filter(domain=clean_host, is_active=True).first()
        
        # Fallback for development/internal (host 'backend' is common in Docker)
        if not entity and (host in ['localhost', '127.0.0.1', 'backend']):
             entity = Entity.objects.filter(is_active=True).first()

        if not entity:
            return Response({"detail": f"Entity not found for domain: {host} (cleaned: {clean_host})"}, status=404)

        serializer = EntityConfigSerializer(entity, context={'request': request})
        
        # Cache the result
        cache.set(cache_key, serializer.data, ENTITY_CONFIG_CACHE_TIMEOUT)
        
        return Response(serializer.data)

    def patch(self, request):
        """Update entity branding (admin only)"""
        host = request.get_host().split(':')[0]
        
        clean_host = host
        if host.startswith('api.'):
            clean_host = host[4:]
        elif host.startswith('www.'):
            clean_host = host[4:]
            
        # Find entity by domain
        entity = Entity.objects.filter(domain=clean_host, is_active=True).first()
        
        # Fallback for development
        if not entity and (host in ['localhost', '127.0.0.1', 'backend']):
            entity = Entity.objects.filter(is_active=True).first()

        if not entity:
            return Response({"detail": f"Entity not found for domain: {host} (cleaned: {clean_host})"}, status=404)

        serializer = EntityConfigSerializer(entity, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            
            # Invalidate cache after update
            cache_key = ENTITY_CONFIG_CACHE_KEY.format(domain=clean_host)
            cache.delete(cache_key)
            
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
