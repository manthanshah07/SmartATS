from django.contrib import admin
from applications.models import (
    Application,
    ApplicationStatusHistory,
    MatchScore,
    Resume,
    ResumeEmbedding,
    ResumeParsedData,
)


class ApplicationStatusHistoryInline(admin.TabularInline):
    model = ApplicationStatusHistory
    extra = 0
    readonly_fields = (
        "changed_by",
        "old_status",
        "new_status",
        "notes",
        "created_at",
    )
    can_delete = False


class MatchScoreInline(admin.StackedInline):
    model = MatchScore
    can_delete = False
    readonly_fields = (
        "overall_score",
        "semantic_score",
        "skill_overlap_score",
        "matched_skills",
        "missing_skills",
        "created_at",
        "updated_at",
    )


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = (
        "original_filename",
        "candidate",
        "file_size",
        "mime_type",
        "uploaded_at",
    )
    search_fields = ("original_filename", "candidate__email")
    list_filter = ("mime_type",)


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "candidate",
        "job",
        "status",
        "created_at",
        "updated_at",
    )
    list_filter = ("status", "job__company")
    search_fields = (
        "candidate__email",
        "job__title",
        "job__company__name",
    )
    inlines = [MatchScoreInline, ApplicationStatusHistoryInline]


@admin.register(ApplicationStatusHistory)
class ApplicationStatusHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "application",
        "old_status",
        "new_status",
        "changed_by",
        "created_at",
    )
    list_filter = ("old_status", "new_status")
    search_fields = ("application__candidate__email", "notes")


@admin.register(ResumeParsedData)
class ResumeParsedDataAdmin(admin.ModelAdmin):
    list_display = ("resume", "parsed_at")
    search_fields = ("resume__candidate__email", "extracted_text")


@admin.register(ResumeEmbedding)
class ResumeEmbeddingAdmin(admin.ModelAdmin):
    list_display = ("resume", "model_version", "created_at")


@admin.register(MatchScore)
class MatchScoreAdmin(admin.ModelAdmin):
    list_display = (
        "application",
        "overall_score",
        "semantic_score",
        "skill_overlap_score",
        "created_at",
    )
    list_filter = ("overall_score",)
    search_fields = (
        "application__candidate__email",
        "application__job__title",
    )
