from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from accounts.models import User
from accounts.permissions import IsCandidate
from applications.filters import ApplicationFilter
from applications.models import Application, ApplicationStatusHistory, Resume
from applications.permissions import CanAccessApplication
from applications.serializers import ApplicationSerializer, ResumeSerializer
from applications.services import ApplicationStateMachine
from jobs.models import Job


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
                "match_score",
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
    def transition(self, request, id=None):
        """
        Transition an application's stage.
        Accepts: target_stage (or target_status / status), notes.
        Allows candidates to withdraw their application.
        Allows recruiters to advance/reject applications.
        """
        application = self.get_object()
        target_stage = (
            request.data.get("target_stage")
            or request.data.get("target_status")
            or request.data.get("status")
        )
        if not target_stage:
            return Response(
                {"detail": "target_stage is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            request.user.role == User.Role.CANDIDATE
            and target_stage != Application.Status.WITHDRAWN
        ):
            return Response(
                {"detail": "Candidates can only transition applications to WITHDRAWN."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if (
            request.user.role == User.Role.CANDIDATE
            and application.candidate != request.user
        ):
            return Response(
                {"detail": "You cannot withdraw another candidate's application."},
                status=status.HTTP_403_FORBIDDEN,
            )

        notes = request.data.get("notes", f"Transitioned to {target_stage}.")
        try:
            ApplicationStateMachine.transition(
                application=application,
                new_status=target_stage,
                changed_by=request.user,
                notes=notes,
            )
        except DjangoValidationError as e:
            return Response(
                {"detail": str(e.message)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            ApplicationSerializer(application).data,
            status=status.HTTP_200_OK,
        )

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


class RecruiterAnalyticsViewSet(viewsets.ViewSet):
    """
    Aggregated metrics for recruiters and platform administrators:
    - total applicants per active job
    - applicant status funnel
    - average time-to-hire
    - average time-in-stage
    """

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        user = request.user
        if user.role not in [User.Role.RECRUITER, User.Role.ADMIN] and not (
            user.is_staff or user.is_superuser
        ):
            return Response(
                {"detail": "Access restricted to recruiters and administrators."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.role == User.Role.ADMIN or user.is_staff or user.is_superuser:
            jobs_qs = Job.objects.all()
        else:
            jobs_qs = Job.objects.filter(recruiter=user)

        active_jobs = jobs_qs.filter(is_active=True).select_related("company")

        # 1. Total applicants per active job
        applicants_per_job = []
        for job in active_jobs:
            total_apps = job.applications.count()
            applicants_per_job.append(
                {
                    "job_id": str(job.id),
                    "job_title": job.title,
                    "company_name": job.company.name if job.company else None,
                    "total_applicants": total_apps,
                }
            )

        # 2. Applicant status funnel
        relevant_applications = Application.objects.filter(job__in=jobs_qs)
        funnel_counts = {choice[0]: 0 for choice in Application.Status.choices}
        status_aggs = relevant_applications.values("status").annotate(total=Count("id"))
        for entry in status_aggs:
            funnel_counts[entry["status"]] = entry["total"]

        funnel_breakdown = [{"status": k, "count": v} for k, v in funnel_counts.items()]

        # 3. Average time-to-hire (days) for applications that reached OFFERED or HIRED
        hired_apps = relevant_applications.filter(
            status__in=[Application.Status.OFFERED, Application.Status.HIRED]
        )
        time_to_hire_list = []
        for app in hired_apps:
            history_record = (
                app.status_history.filter(
                    new_status__in=[
                        Application.Status.OFFERED,
                        Application.Status.HIRED,
                    ]
                )
                .order_by("created_at")
                .first()
            )
            if history_record:
                duration_days = (
                    history_record.created_at - app.created_at
                ).total_seconds() / 86400.0
            else:
                duration_days = (
                    app.updated_at - app.created_at
                ).total_seconds() / 86400.0
            time_to_hire_list.append(max(0.0, duration_days))

        avg_time_to_hire = (
            round(sum(time_to_hire_list) / len(time_to_hire_list), 2)
            if time_to_hire_list
            else 0.0
        )

        # 4. Average time-in-stage (days)
        stage_times = {st: [] for st in Application.Status.values}
        histories = (
            ApplicationStatusHistory.objects.filter(
                application__in=relevant_applications
            )
            .select_related("application")
            .order_by("application_id", "created_at")
        )

        last_time_map = {}
        for entry in histories:
            app_id = entry.application_id
            if app_id not in last_time_map:
                prev_time = entry.application.created_at
            else:
                prev_time = last_time_map[app_id]
            delta_days = max(
                0.0, (entry.created_at - prev_time).total_seconds() / 86400.0
            )
            stage_key = entry.old_status or Application.Status.APPLIED
            stage_times.setdefault(stage_key, []).append(delta_days)
            last_time_map[app_id] = entry.created_at

        avg_time_in_stage = {
            st: round(sum(vals) / len(vals), 2) if vals else 0.0
            for st, vals in stage_times.items()
        }

        data = {
            "total_active_jobs": active_jobs.count(),
            "total_applications": relevant_applications.count(),
            "applicants_per_job": applicants_per_job,
            "status_funnel": funnel_counts,
            "funnel_breakdown": funnel_breakdown,
            "average_time_to_hire_days": avg_time_to_hire,
            "average_time_in_stage_days": avg_time_in_stage,
        }
        return Response(data, status=status.HTTP_200_OK)
