import uuid
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from jobs.models import Job


class Resume(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resumes",
    )
    file = models.FileField(upload_to="resumes/%Y/%m/")
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "resumes"
        verbose_name = _("resume")
        verbose_name_plural = _("resumes")
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.original_filename} ({self.candidate.email})"


class Application(models.Model):
    class Status(models.TextChoices):
        APPLIED = "APPLIED", _("Applied")
        SCREENING = "SCREENING", _("Screening")
        SHORTLISTED = "SHORTLISTED", _("Shortlisted")
        INTERVIEW_SCHEDULED = (
            "INTERVIEW_SCHEDULED",
            _("Interview Scheduled"),
        )
        OFFERED = "OFFERED", _("Offered")
        REJECTED = "REJECTED", _("Rejected")
        WITHDRAWN = "WITHDRAWN", _("Withdrawn")
        HIRED = "HIRED", _("Hired")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    resume = models.ForeignKey(
        Resume,
        on_delete=models.PROTECT,
        related_name="applications",
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.APPLIED,
        db_index=True,
    )
    cover_letter = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "applications"
        verbose_name = _("application")
        verbose_name_plural = _("applications")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["job", "candidate"],
                name="unique_job_candidate_application",
            )
        ]
        indexes = [
            models.Index(fields=["job"], name="idx_applications_job"),
            models.Index(fields=["candidate"], name="idx_applications_cand"),
            models.Index(fields=["status"], name="idx_applications_status"),
        ]

    def __str__(self):
        return f"{self.candidate.email} - {self.job.title} [{self.status}]"

    def clean(self):
        super().clean()
        if self.pk:
            from applications.services import ApplicationStateMachine

            try:
                orig = Application.objects.get(pk=self.pk)
                if orig.status != self.status:
                    ApplicationStateMachine.validate_transition(
                        orig.status, self.status
                    )
            except Application.DoesNotExist:
                pass


class ApplicationStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="status_audit_logs",
    )
    old_status = models.CharField(
        max_length=30,
        choices=Application.Status.choices,
        blank=True,
        null=True,
    )
    new_status = models.CharField(
        max_length=30,
        choices=Application.Status.choices,
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "application_status_history"
        verbose_name = _("application status history")
        verbose_name_plural = _("application status histories")
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"App {self.application_id}: "
            f"{self.old_status or 'START'} -> {self.new_status}"
        )
