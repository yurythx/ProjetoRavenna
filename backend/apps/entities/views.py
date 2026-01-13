from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Entity
from .serializers import EntityConfigSerializer

class EntityConfigView(APIView):
    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAdminUser()]
        return [AllowAny()]

    def get(self, request):
        host = request.get_host().split(':')[0]  # Remove port if present
        
        # Try to find entity by domain
        entity = Entity.objects.filter(domain=host, is_active=True).first()
        
        # Fallback for development (optional: allow getting the first one if no domain matches)
        if not entity and (host == 'localhost' or host == '127.0.0.1'):
             entity = Entity.objects.filter(is_active=True).first()

        if not entity:
            return Response({"detail": "Entity not found for this domain."}, status=404)

        serializer = EntityConfigSerializer(entity, context={'request': request})
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
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
