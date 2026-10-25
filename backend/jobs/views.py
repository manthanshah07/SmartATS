from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from accounts.models import User
from accounts.permissions import IsAdminUser
from jobs.filters import JobFilter
from jobs.models import Company, Job, JobSkill
from jobs.permissions import (
    IsCompanyManagerOrAdmin,
    IsJobOwnerOrAdmin,
    IsRecruiterOrReadOnly,
)
from jobs.serializers import (
    CompanySerializer,
    JobSerializer,
    JobSkillSerializer,
)


class CompanyViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Companies.
    Read-only for public/candidates, creation/updating for recruiters & admins.
    """

    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    lookup_field = "id"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "industry", "description"]
    ordering_fields = ["created_at", "name"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        if self.action == "verify":
            return [IsAdminUser()]
        return [IsRecruiterOrReadOnly(), IsCompanyManagerOrAdmin()]

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def verify(self, request, id=None):
        """Allows platform administrators to verify a company."""
        company = self.get_object()
        company.is_verified = True
        company.save(update_fields=["is_verified"])
        return Response(
            {
                "detail": f"Company '{company.name}' has been verified.",
                "company": CompanySerializer(company).data,
            },
            status=status.HTTP_200_OK,
        )


class JobViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Job Requisitions.
    Public and candidate read access to active jobs.
    Write access strictly restricted to verified recruiters.
    """

    serializer_class = JobSerializer
    lookup_field = "id"
    filterset_class = JobFilter
    search_fields = [
        "title",
        "description",
        "location",
        "department",
        "company__name",
        "skills__skill_name",
    ]
    ordering_fields = ["created_at", "salary_min", "salary_max", "title"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsRecruiterOrReadOnly(), IsJobOwnerOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        queryset = (
            Job.objects.select_related("company", "recruiter")
            .prefetch_related("skills")
            .distinct()
        )

        # Candidates and unauthenticated users can only see active job listings
        if not user.is_authenticated or user.role == User.Role.CANDIDATE:
            return queryset.filter(is_active=True)

        # Recruiters & Admins can filter by is_active, or see all if unconstrained
        is_active_param = self.request.query_params.get("is_active")
        if is_active_param is not None:
            active_bool = is_active_param.lower() in ("true", "1")
            return queryset.filter(is_active=active_bool)

        return queryset


class JobSkillViewSet(viewsets.ModelViewSet):
    """
    Optional fine-grained ViewSet for skills attached to jobs.
    """

    serializer_class = JobSkillSerializer
    permission_classes = [IsAuthenticated, IsRecruiterOrReadOnly]

    def get_queryset(self):
        job_id = self.kwargs.get("job_id")
        if job_id:
            return JobSkill.objects.filter(job_id=job_id)
        return JobSkill.objects.all()

    def perform_create(self, serializer):
        job = Job.objects.get(id=self.kwargs.get("job_id"))
        serializer.save(job=job)
