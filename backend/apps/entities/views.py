from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Entity
from .serializers import EntityConfigSerializer

class EntityConfigView(APIView):
    permission_classes = [AllowAny]

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
