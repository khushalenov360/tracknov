from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
)
from .permissions import IsEnov360Admin


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — returns access + refresh + user object."""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — public self-registration (role defaults to client)."""
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(tokens.access_token),
                "refresh": str(tokens),
            },
            status=status.HTTP_201_CREATED,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """POST /api/auth/logout/ — blacklist the refresh token."""
    try:
        token = RefreshToken(request.data["refresh"])
        token.blacklist()
        return Response({"detail": "Logged out."})
    except Exception:
        return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/me/ — current user profile."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer(self, *args, **kwargs):
        # Block role/is_staff changes from self-edit
        kwargs.setdefault("context", self.get_serializer_context())
        serializer = super().get_serializer(*args, **kwargs)
        for field in ("role", "is_active", "is_staff"):
            serializer.fields.pop(field, None)
        return serializer


class ChangePasswordView(generics.GenericAPIView):
    """POST /api/auth/change-password/"""
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated."})


# ── Admin-only user management ───────────────────────────────────────────────

class UserListView(generics.ListCreateAPIView):
    """GET  /api/auth/users/  — list all users (admin only)
       POST /api/auth/users/  — create user directly (admin only, can set any role)
    """
    serializer_class = UserSerializer
    permission_classes = [IsEnov360Admin]
    queryset = User.objects.all()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return RegisterSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/users/<id>/"""
    serializer_class = UserSerializer
    permission_classes = [IsEnov360Admin]
    queryset = User.objects.all()
