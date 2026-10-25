import uuid
from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _


class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    website = models.URLField(max_length=255, blank=True, null=True)
    logo_url = models.URLField(max_length=500, blank=True, null=True)
    industry = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "companies"
        verbose_name = _("company")
        verbose_name_plural = _("companies")
        ordering = ["-created_at"]

    def __str__(self):
        status = "Verified" if self.is_verified else "Unverified"
        return f"{self.name} ({status})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or "company"
            slug = base_slug
            counter = 1
            while Company.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Job(models.Model):
    class JobType(models.TextChoices):
        FULL_TIME = "FULL_TIME", _("Full Time")
        PART_TIME = "PART_TIME", _("Part Time")
        CONTRACT = "CONTRACT", _("Contract")
        INTERNSHIP = "INTERNSHIP", _("Internship")
        REMOTE = "REMOTE", _("Remote")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="jobs",
    )
    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="posted_jobs",
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    department = models.CharField(max_length=100, blank=True, default="")
    location = models.CharField(max_length=150, blank=True, default="")
    job_type = models.CharField(
        max_length=50,
        choices=JobType.choices,
        default=JobType.FULL_TIME,
    )
    salary_min = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    salary_max = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "jobs"
        verbose_name = _("job")
        verbose_name_plural = _("jobs")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company"], name="idx_jobs_company"),
            models.Index(fields=["is_active"], name="idx_jobs_active"),
        ]

    def __str__(self):
        return f"{self.title} at {self.company.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            company_name = self.company.name if self.company else "job"
            base_slug = slugify(f"{company_name}-{self.title}") or "job"
            slug = base_slug
            counter = 1
            while Job.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class JobSkill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="skills",
    )
    skill_name = models.CharField(max_length=100)
    is_required = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "job_skills"
        verbose_name = _("job skill")
        verbose_name_plural = _("job skills")
        indexes = [
            models.Index(fields=["skill_name"], name="idx_job_skills_name"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["job", "skill_name"],
                name="unique_job_skill",
            )
        ]

    def __str__(self):
        tier = "Required" if self.is_required else "Preferred"
        return f"{self.skill_name} ({tier}) - {self.job.title}"
