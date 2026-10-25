from django.contrib import admin
from interviews.models import Interview


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = (
        "round_name",
        "application",
        "recruiter",
        "scheduled_start",
        "scheduled_end",
        "status",
        "rating",
    )
    list_filter = ("status", "scheduled_start", "round_name")
    search_fields = (
        "round_name",
        "application__candidate__email",
        "recruiter__email",
        "meeting_url",
    )
