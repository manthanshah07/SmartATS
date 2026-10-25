import logging
from django.db import DatabaseError, OperationalError
from rest_framework import generics, permissions, status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from accounts.models import User
from accounts.serializers import (
    CandidateProfileSerializer,
    CustomTokenObtainPairSerializer,
    LogoutSerializer,
    RecruiterProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint returning access and refresh tokens
    with custom claims (role, email, user_id).
    Ensures that invalid credentials, missing users, or database errors
    return structured JSON responses with CORS headers intact.
    """

    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            try:
                serializer.is_valid(raise_exception=True)
            except ValidationError as e:
                return Response(
                    {
                        "detail": "Invalid credentials or request data.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except AuthenticationFailed as e:
                detail_msg = (
                    e.detail
                    if isinstance(e.detail, str)
                    else "No active account found with the given credentials."
                )
                return Response(
                    {"detail": detail_msg},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            except (TokenError, InvalidToken) as e:
                return Response(
                    {"detail": str(e) or "Token generation failed."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        except (OperationalError, DatabaseError) as e:
            logger.error(f"Database error during login: {e}")
            return Response(
                {"detail": "Database connection error. Please try again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.error(f"Unhandled error during login: {e}", exc_info=True)
            return Response(
                {"detail": "Unable to complete authentication. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class RegisterView(generics.CreateAPIView):
    """
    Public registration endpoint for Candidate and Recruiter roles.
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()

            # Generate tokens on registration
            refresh = RefreshToken.for_user(user)
            refresh["role"] = user.role
            refresh["email"] = user.email
            refresh["user_id"] = str(user.id)

            user_data = UserSerializer(user).data

            return Response(
                {
                    "user": user_data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {"detail": "Validation error.", "errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (OperationalError, DatabaseError) as e:
            logger.error(f"Database error during registration: {e}")
            return Response(
                {"detail": "Database connection error. Please try again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.error(f"Unhandled error during registration: {e}", exc_info=True)
            return Response(
                {"detail": f"Registration failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class LogoutView(APIView):
    """
    Logout endpoint that accepts a refresh token and blacklists it.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data["refresh"]

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"detail": "Successfully logged out. Token has been blacklisted."},
                status=status.HTTP_200_OK,
            )
        except TokenError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieves or updates the authenticated user's details and role profile.
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()

        # Update base user fields if provided
        user_serializer = self.get_serializer(user, data=request.data, partial=True)
        user_serializer.is_valid(raise_exception=True)
        user_serializer.save()

        # Update candidate or recruiter profile data
        profile_data = (
            request.data.get("candidate_profile")
            or request.data.get("recruiter_profile")
            or request.data
        )

        if user.role == User.Role.CANDIDATE and hasattr(user, "candidate_profile"):
            p_serializer = CandidateProfileSerializer(
                user.candidate_profile, data=profile_data, partial=True
            )
            if p_serializer.is_valid():
                p_serializer.save()
        elif user.role == User.Role.RECRUITER and hasattr(user, "recruiter_profile"):
            p_serializer = RecruiterProfileSerializer(
                user.recruiter_profile, data=profile_data, partial=True
            )
            if p_serializer.is_valid():
                p_serializer.save()

        # Reload updated user instance
        user.refresh_from_db()
        return Response(self.get_serializer(user).data)
