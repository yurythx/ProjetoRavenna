from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .profile_serializers import UserProfileSerializer, UserProfileUpdateSerializer, AvatarUploadSerializer

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
