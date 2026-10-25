from datetime import datetime, timezone
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.models import User
from interviews.models import Interview
from interviews.serializers import InterviewSerializer


class InterviewViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Interviews.
    - Recruiters can schedule, update, cancel, and provide feedback/ratings.
    - Candidates can only view their own scheduled interviews and download .ics files.
    """

    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["scheduled_start", "created_at", "status"]
    ordering = ["-scheduled_start"]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Interview.objects.none()

        if user.role == User.Role.CANDIDATE:
            queryset = Interview.objects.filter(application__candidate=user)
        elif user.role == User.Role.RECRUITER:
            queryset = Interview.objects.filter(
                Q(recruiter=user) | Q(application__job__recruiter=user)
            ).distinct()
        else:
            # Admin / Superuser
            queryset = Interview.objects.all()

        queryset = queryset.select_related(
            "application",
            "application__candidate",
            "application__candidate__candidate_profile",
            "application__job",
            "application__job__company",
            "recruiter",
        )

        app_id = self.request.query_params.get("application_id")
        if app_id:
            queryset = queryset.filter(application_id=app_id)

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param.upper())

        return queryset

    def check_recruiter_write_permission(self):
        user = self.request.user
        if user.role not in [User.Role.RECRUITER, User.Role.ADMIN] and not (
            user.is_staff or user.is_superuser
        ):
            return False
        return True

    def create(self, request, *args, **kwargs):
        if not self.check_recruiter_write_permission():
            return Response(
                {"detail": "Only recruiters are authorized to schedule interviews."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not self.check_recruiter_write_permission():
            return Response(
                {"detail": "Only recruiters are authorized to update interviews."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self.check_recruiter_write_permission():
            return Response(
                {"detail": "Only recruiters are authorized to modify interviews."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self.check_recruiter_write_permission():
            return Response(
                {"detail": "Only recruiters can cancel/delete interviews."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get"], url_path="ics")
    def ics(self, request, pk=None):
        """
        Generates and returns an RFC-5545 compliant .ics calendar invitation file.
        Accessible by the candidate and the recruiter involved.
        """
        interview = self.get_object()

        # Format timestamps in standard iCalendar UTC: YYYYMMDDTHHMMSSZ
        def format_ical_dt(dt):
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return dt.strftime("%Y%m%dT%H%M%SZ")

        now_utc = format_ical_dt(datetime.now(timezone.utc))
        dtstart = format_ical_dt(interview.scheduled_start)
        dtend = format_ical_dt(interview.scheduled_end)

        job_title = interview.application.job.title
        company_name = interview.application.job.company.name
        meeting_url = interview.meeting_url or "Online meeting link TBD"
        summary = f"Interview: {interview.round_name} - {job_title} at {company_name}"
        description = (
            f"SmartATS Interview Session\\n"
            f"Position: {job_title}\\n"
            f"Company: {company_name}\\n"
            f"Round: {interview.round_name}\\n"
            f"Meeting Link: {meeting_url}\\n"
        )

        ics_content = (
            "BEGIN:VCALENDAR\r\n"
            "VERSION:2.0\r\n"
            "PRODID:-//SmartATS//Interview Schedule//EN\r\n"
            "CALSCALE:GREGORIAN\r\n"
            "METHOD:REQUEST\r\n"
            "BEGIN:VEVENT\r\n"
            f"UID:interview-{interview.id}@smartats.com\r\n"
            f"DTSTAMP:{now_utc}\r\n"
            f"DTSTART:{dtstart}\r\n"
            f"DTEND:{dtend}\r\n"
            f"SUMMARY:{summary}\r\n"
            f"DESCRIPTION:{description}\r\n"
            f"LOCATION:{meeting_url}\r\n"
            f"STATUS:{interview.status}\r\n"
            "END:VEVENT\r\n"
            "END:VCALENDAR\r\n"
        )

        response = HttpResponse(
            ics_content,
            content_type="text/calendar; charset=utf-8",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="interview-{interview.id}.ics"'
        )
        return response
