import uuid
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from jobs.models import Job
from pgvector.django import VectorField


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


class ResumeParsedData(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resume = models.OneToOneField(
        Resume,
        on_delete=models.CASCADE,
        related_name="parsed_data",
    )
    extracted_text = models.TextField()
    skills = models.JSONField(default=list, blank=True)
    experience_years = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True
    )
    education = models.JSONField(default=list, blank=True)
    parsed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "resume_parsed_data"
        verbose_name = _("resume parsed data")
        verbose_name_plural = _("resume parsed data")

    def __str__(self):
        return f"ParsedData for Resume {self.resume_id}"


class ResumeEmbedding(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resume = models.OneToOneField(
        Resume,
        on_delete=models.CASCADE,
        related_name="embedding_record",
    )
    embedding = VectorField(dimensions=384)
    model_version = models.CharField(max_length=50, default="all-MiniLM-L6-v2")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "resume_embeddings"
        verbose_name = _("resume embedding")
        verbose_name_plural = _("resume embeddings")

    def __str__(self):
        return f"Embedding for Resume {self.resume_id} ({self.model_version})"


class MatchScore(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name="match_score",
    )
    overall_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Weighted match score (0-100)",
    )
    semantic_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Embedding cosine similarity (0-100)",
    )
    skill_overlap_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Skill overlap ratio (0-100)",
    )
    matched_skills = models.JSONField(default=list, blank=True)
    missing_skills = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "match_scores"
        verbose_name = _("match score")
        verbose_name_plural = _("match scores")
        ordering = ["-overall_score"]

    def __str__(self):
        cand_email = self.application.candidate.email
        job_title = self.application.job.title
        return f"MatchScore: {self.overall_score}% ({cand_email} -> {job_title})"
