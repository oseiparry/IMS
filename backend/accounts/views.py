# accounts/views.py
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model

from .models import ActivityLog
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, LoginSerializer,
    AdminSetPasswordSerializer
)

User = get_user_model()


# -----------------------------------------------------------------
# Permissions
class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_super_admin


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin_user


# -----------------------------------------------------------------
# Authentication Views
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'User account is disabled'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)

        ActivityLog.objects.create(
            user=user,
            action='login',
            details=f"User {user.username} logged in"
        )

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'message': 'Logged out'})


class CurrentUserView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


# -----------------------------------------------------------------
# User CRUD
class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        # Exclude the requesting user from the list
        return User.objects.exclude(id=self.request.user.id)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action='create_user',
            details=f"Created user {user.username} with role {user.role}"
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def perform_update(self, serializer):
        user = serializer.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action='update_user',
            details=f"Updated user {user.username}"
        )

    def perform_destroy(self, instance):
        username = instance.username
        instance.is_active = False
        instance.save()
        ActivityLog.objects.create(
            user=self.request.user,
            action='deactivate_user',
            details=f"Deactivated user {username}"
        )

class ActivityLogView(generics.ListAPIView):
    serializer_class = None

    def get_queryset(self):
        return ActivityLog.objects.select_related('user').order_by('-created_at')[:100]
    
# -----------------------------------------------------------------
# Password change (logged‑in user)
class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.must_change_password = False   # clear flag if it was set
        request.user.save()

        ActivityLog.objects.create(
            user=request.user,
            action='change_password',
            details=f"User {request.user.username} changed password"
        )

        return Response({'message': 'Password changed successfully'})

class SetPasswordView(APIView):
    """
    POST /auth/users/<uuid:pk>/set-password/
    Body: { "new_password": "the‑password‑the‑user‑told‑the‑admin" }
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AdminSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        ActivityLog.objects.create(
            user=request.user,
            action='admin_set_password',
            details=(
                f"Super admin set password for user {user.username} "
                f"to the value supplied by the user."
            )
        )
        return Response(
            {'message': f'Password for {user.username} has been set'},
            status=status.HTTP_200_OK
        )
    
#delete user functonality 
class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    # Ensure only Super Admins can hard delete
    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [permissions.IsAdminUser()] # Or a custom IsSuperAdmin permission
        return [permissions.IsAuthenticated()]