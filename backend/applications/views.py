from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from accounts.models import User
from accounts.permissions import IsCandidate
from applications.filters import ApplicationFilter
from applications.models import Application, Resume
from applications.permissions import CanAccessApplication
from applications.serializers import ApplicationSerializer, ResumeSerializer
from applications.services import ApplicationStateMachine


class ResumeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for uploading and managing resumes.
    Restricted to Candidates (and platform Admins).
    """

    serializer_class = ResumeSerializer
    parser_classes = [MultiPartParser, FormParser]
    lookup_field = "id"

    def get_permissions(self):
        return [permissions.IsAuthenticated(), IsCandidate()]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN or user.is_staff or user.is_superuser:
            return Resume.objects.all()
        return Resume.objects.filter(candidate=user)


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Job Application submissions, stage management,
    and lifecycle audits.
    - Candidates: Submit applications, view own applications, withdraw.
    - Recruiters: Review applications for company jobs, update stages.
    """

    serializer_class = ApplicationSerializer
    lookup_field = "id"
    filterset_class = ApplicationFilter
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = [
        "job__title",
        "job__company__name",
        "candidate__email",
        "candidate__candidate_profile__first_name",
        "candidate__candidate_profile__last_name",
    ]
    ordering_fields = ["created_at", "updated_at", "status"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsCandidate()]
        return [permissions.IsAuthenticated(), CanAccessApplication()]

    def get_queryset(self):
        user = self.request.user
        queryset = (
            Application.objects.select_related(
                "job",
                "job__company",
                "candidate",
                "resume",
            )
            .prefetch_related("status_history")
            .distinct()
        )

        if user.role == User.Role.ADMIN or user.is_staff or user.is_superuser:
            return queryset

        if user.role == User.Role.CANDIDATE:
            return queryset.filter(candidate=user)

        if user.role == User.Role.RECRUITER:
            company = (
                user.recruiter_profile.company
                if hasattr(user, "recruiter_profile")
                else None
            )
            if company:
                return queryset.filter(job__company=company)
            return queryset.filter(job__recruiter=user)

        return Application.objects.none()

    @action(detail=True, methods=["post"])
    def withdraw(self, request, id=None):
        """Allows candidates to withdraw their application."""
        application = self.get_object()
        if (
            request.user.role == User.Role.CANDIDATE
            and application.candidate != request.user
        ):
            return Response(
                {"detail": "You cannot withdraw another candidate's application."},
                status=status.HTTP_403_FORBIDDEN,
            )

        notes = request.data.get("notes", "Withdrawn by candidate.")
        ApplicationStateMachine.transition(
            application=application,
            new_status=Application.Status.WITHDRAWN,
            changed_by=request.user,
            notes=notes,
        )
        return Response(
            ApplicationSerializer(application).data,
            status=status.HTTP_200_OK,
        )
