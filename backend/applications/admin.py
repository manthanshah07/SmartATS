from django.contrib import admin
from applications.models import (
    Application,
    ApplicationStatusHistory,
    Resume,
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
    inlines = [ApplicationStatusHistoryInline]


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
