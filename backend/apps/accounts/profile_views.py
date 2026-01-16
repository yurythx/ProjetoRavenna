from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .profile_serializers import UserProfileSerializer, UserProfileUpdateSerializer, AvatarUploadSerializer, AdminUserSerializer
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from .models import CustomUser
from rest_framework.pagination import PageNumberPagination
from django.db import models
from django.contrib.auth.models import Group, Permission
from rest_framework import serializers

class UserProfileView(APIView):
    """
    GET: Retrieve current user profile
    PATCH: Update current user profile
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get current user profile",
        responses={200: UserProfileSerializer}
    )
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Update current user profile",
        request=UserProfileUpdateSerializer,
        responses={
            200: UserProfileSerializer,
            400: OpenApiResponse(description="Validation error")
        }
    )
    def patch(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            # Return full profile after update
            response_serializer = UserProfileSerializer(request.user)
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AvatarUploadView(APIView):
    """
    POST: Upload user avatar
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    @extend_schema(
        summary="Upload user avatar",
        request=AvatarUploadSerializer,
        responses={
            200: UserProfileSerializer,
            400: OpenApiResponse(description="Validation error")
        }
    )
    def post(self, request):
        serializer = AvatarUploadSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            # Delete old avatar if exists
            if request.user.avatar:
                request.user.avatar.delete(save=False)
            
            serializer.save()
            # Return full profile after upload
            response_serializer = UserProfileSerializer(request.user)
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for users (staff-only)
    """
    queryset = CustomUser.objects.all().order_by('-date_joined')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'id'
    class Pagination(PageNumberPagination):
        page_size = 10
        page_size_query_param = 'page_size'
        max_page_size = 100
    pagination_class = Pagination
    search_fields = ['email', 'first_name', 'last_name', 'username']
    ordering_fields = ['first_name', 'last_name', 'email', 'date_joined', 'last_login', 'is_staff', 'is_active']
    
    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get('q')
        role = self.request.query_params.get('role')
        group = self.request.query_params.get('group')
        perm = self.request.query_params.get('perm')
        if q:
            q_lower = q.lower()
            qs = qs.filter(
                models.Q(email__icontains=q_lower) |
                models.Q(first_name__icontains=q_lower) |
                models.Q(last_name__icontains=q_lower)
            )
        if role == 'admin':
            qs = qs.filter(is_staff=True)
        elif role == 'user':
            qs = qs.filter(is_staff=False, is_active=True)
        elif role == 'inactive':
            qs = qs.filter(is_active=False)
        if group:
            qs = qs.filter(groups__id=group)
        if perm:
            qs = qs.filter(models.Q(user_permissions__id=perm) | models.Q(groups__permissions__id=perm)).distinct()
        return qs

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class PermissionSerializer(serializers.ModelSerializer):
    content_type = serializers.SerializerMethodField()
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type']
    def get_content_type(self, obj):
        return obj.content_type.model if obj.content_type else None

class GroupViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Group.objects.all().order_by('name')
    serializer_class = GroupSerializer
    permission_classes = [IsAdminUser]

class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all().order_by('content_type__model', 'codename')
    serializer_class = PermissionSerializer
    permission_classes = [IsAdminUser]
