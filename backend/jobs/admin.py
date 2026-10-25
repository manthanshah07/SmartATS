from django.contrib import admin
from jobs.models import Company, Job, JobSkill


class JobSkillInline(admin.TabularInline):
    model = JobSkill
    extra = 1


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "industry", "is_verified", "created_at")
    list_filter = ("is_verified", "industry")
    search_fields = ("name", "industry", "description")
    prepopulated_fields = {"slug": ("name",)}
    actions = ["verify_companies"]

    @admin.action(description="Mark selected companies as verified")
    def verify_companies(self, request, queryset):
        queryset.update(is_verified=True)


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "company",
        "recruiter",
        "job_type",
        "location",
        "is_active",
        "created_at",
    )
    list_filter = ("job_type", "is_active", "company")
    search_fields = ("title", "description", "location", "company__name")
    inlines = [JobSkillInline]


@admin.register(JobSkill)
class JobSkillAdmin(admin.ModelAdmin):
    list_display = ("skill_name", "job", "is_required", "created_at")
    list_filter = ("is_required",)
    search_fields = ("skill_name", "job__title")
