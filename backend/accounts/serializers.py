from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from accounts.models import CandidateProfile, RecruiterProfile, User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that injects role, email, and user_id into token claims.
    """

    username_field = User.USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Custom claims
        token["email"] = user.email
        token["role"] = user.role
        token["user_id"] = str(user.id)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Include user profile metadata in response body
        user_info = {
            "id": str(self.user.id),
            "email": self.user.email,
            "role": self.user.role,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
        }
        if hasattr(self.user, "recruiter_profile") and self.user.recruiter_profile:
            rec = self.user.recruiter_profile
            user_info["company_id"] = str(rec.company_id) if rec.company_id else None
            user_info["company_name"] = rec.company_name or (rec.company.name if rec.company else None)
            user_info["title"] = rec.title
        data["user"] = user_info
        return data


class CandidateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateProfile
        fields = [
            "id",
            "first_name",
            "last_name",
            "phone",
            "headline",
            "bio",
            "location",
            "linkedin_url",
            "github_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RecruiterProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruiterProfile
        fields = [
            "id",
            "company",
            "company_name",
            "title",
            "department",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UserSerializer(serializers.ModelSerializer):
    candidate_profile = CandidateProfileSerializer(read_only=True)
    recruiter_profile = RecruiterProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "role",
            "is_active",
            "date_joined",
            "candidate_profile",
            "recruiter_profile",
        ]
        read_only_fields = ["id", "is_active", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    role = serializers.ChoiceField(
        choices=User.Role.choices, default=User.Role.CANDIDATE
    )
    first_name = serializers.CharField(
        write_only=True, required=False, allow_blank=True, default=""
    )
    last_name = serializers.CharField(
        write_only=True, required=False, allow_blank=True, default=""
    )
    company_name = serializers.CharField(
        write_only=True, required=False, allow_blank=True, default=""
    )
    title = serializers.CharField(
        write_only=True, required=False, allow_blank=True, default=""
    )

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "role",
            "first_name",
            "last_name",
            "company_name",
            "title",
        ]

    def validate_email(self, value):
        normalized = value.lower().strip()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized

    def create(self, validated_data):
        first_name = validated_data.pop("first_name", "")
        last_name = validated_data.pop("last_name", "")
        company_name = validated_data.pop("company_name", "")
        title = validated_data.pop("title", "")
        password = validated_data.pop("password")
        role = validated_data.get("role", User.Role.CANDIDATE)

        user = User.objects.create_user(
            email=validated_data["email"],
            password=password,
            role=role,
            first_name=first_name,
            last_name=last_name,
        )

        if role == User.Role.CANDIDATE:
            CandidateProfile.objects.update_or_create(
                user=user,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                },
            )
        elif role == User.Role.RECRUITER:
            RecruiterProfile.objects.update_or_create(
                user=user,
                defaults={
                    "company_name": company_name,
                    "title": title,
                },
            )

        return user


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True)
