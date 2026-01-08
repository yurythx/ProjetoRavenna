from rest_framework import viewsets, permissions
from .models import AppModule
from .core_serializers import AppModuleSerializer

class AppModuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing AppModules.
    Only accessible by staff users.
    """
    queryset = AppModule.objects.all().order_by('display_name')
    serializer_class = AppModuleSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'slug'

    def get_queryset(self):
        return AppModule.objects.all().order_by('display_name')
