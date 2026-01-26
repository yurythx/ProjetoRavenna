from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Entity

class TenantConfigView(APIView):
    def get(self, request):
        obj = Entity.objects.first()
        if obj:
            return Response({
                "name": obj.brand_name or obj.name,
                "primary_color": obj.primary_color,
                "secondary_color": obj.secondary_color,
                "favicon_url": obj.favicon.url if obj.favicon else None,
            })
        return Response({
            "name": "Projeto Ravenna",
            "primary_color": "#4f46e5",
            "secondary_color": "#22c55e",
            "favicon_url": None,
        })
