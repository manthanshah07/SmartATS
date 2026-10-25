from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from accounts.models import User
from applications.models import Application
from interviews.models import Interview
from notifications.models import Notification


class InterviewSerializer(serializers.ModelSerializer):
    application_id = serializers.PrimaryKeyRelatedField(
        queryset=Application.objects.all(),
        source="application",
        write_only=True,
    )
    recruiter_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role__in=[User.Role.RECRUITER, User.Role.ADMIN]),
        source="recruiter",
        required=False,
    )

    # Read-only nested context
    candidate_email = serializers.EmailField(
        source="application.candidate.email", read_only=True
    )
    candidate_name = serializers.SerializerMethodField()
    job_title = serializers.CharField(source="application.job.title", read_only=True)
    job_id = serializers.UUIDField(source="application.job.id", read_only=True)
    company_name = serializers.CharField(
        source="application.job.company.name", read_only=True
    )

    class Meta:
        model = Interview
        fields = [
            "id",
            "application",
            "application_id",
            "recruiter",
            "recruiter_id",
            "round_name",
            "scheduled_start",
            "scheduled_end",
            "meeting_url",
            "status",
            "feedback",
            "rating",
            "candidate_name",
            "candidate_email",
            "job_title",
            "job_id",
            "company_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "application",
            "recruiter",
            "created_at",
            "updated_at",
        ]

    def get_candidate_name(self, obj):
        try:
            profile = obj.application.candidate.candidate_profile
            return f"{profile.first_name} {profile.last_name}".strip() or None
        except Exception:
            return None

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        application = attrs.get(
            "application", getattr(self.instance, "application", None)
        )
        if application and user and user.is_authenticated and not user.is_admin_role:
            recruiter_profile = getattr(user, "recruiter_profile", None)
            if not recruiter_profile:
                raise serializers.ValidationError(
                    {"application_id": _("Recruiter profile is required.")}
                )
            recruiter_company = recruiter_profile.company
            if (
                recruiter_company is not None
                and application.job.company != recruiter_company
            ):
                raise serializers.ValidationError(
                    {
                        "application_id": _(
                            "You are only authorized to schedule interviews for your "
                            "assigned company's job applications."
                        )
                    }
                )
            if recruiter_company is None and application.job.recruiter != user:
                raise serializers.ValidationError(
                    {
                        "application_id": _(
                            "You are only authorized to schedule interviews for your "
                            "assigned company's job applications."
                        )
                    }
                )

        start = attrs.get(
            "scheduled_start",
            getattr(self.instance, "scheduled_start", None),
        )
        end = attrs.get(
            "scheduled_end",
            getattr(self.instance, "scheduled_end", None),
        )
        if start and end and end <= start:
            raise serializers.ValidationError(
                {
                    "scheduled_end": _(
                        "Scheduled end time must be after scheduled start time."
                    )
                }
            )

        rating = attrs.get("rating", getattr(self.instance, "rating", None))
        if rating is not None and (rating < 1 or rating > 5):
            raise serializers.ValidationError(
                {"rating": _("Rating must be an integer between 1 and 5.")}
            )

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if (
            "recruiter" not in validated_data
            and request
            and request.user.is_authenticated
        ):
            validated_data["recruiter"] = request.user

        interview = super().create(validated_data)

        # Notify candidate about scheduled interview
        candidate = interview.application.candidate
        job_title = interview.application.job.title
        Notification.objects.create(
            user=candidate,
            title=f"Interview Scheduled: {interview.round_name}",
            message=(
                f"You have an interview scheduled for '{job_title}' on "
                f"{interview.scheduled_start.strftime('%Y-%m-%d %H:%M UTC')}."
            ),
            link=f"/interviews/{interview.id}/",
        )

        return interview
