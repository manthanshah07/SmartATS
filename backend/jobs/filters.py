import django_filters
from jobs.models import Job


class JobFilter(django_filters.FilterSet):
    location = django_filters.CharFilter(field_name="location", lookup_expr="icontains")
    department = django_filters.CharFilter(
        field_name="department", lookup_expr="icontains"
    )
    job_type = django_filters.ChoiceFilter(
        field_name="job_type", choices=Job.JobType.choices
    )
    company = django_filters.UUIDFilter(field_name="company__id")
    company_slug = django_filters.CharFilter(
        field_name="company__slug", lookup_expr="iexact"
    )
    salary_min = django_filters.NumberFilter(field_name="salary_min", lookup_expr="gte")
    salary_max = django_filters.NumberFilter(field_name="salary_max", lookup_expr="lte")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    skill = django_filters.CharFilter(
        field_name="skills__skill_name", lookup_expr="icontains"
    )

    class Meta:
        model = Job
        fields = [
            "location",
            "department",
            "job_type",
            "company",
            "company_slug",
            "salary_min",
            "salary_max",
            "is_active",
            "skill",
        ]
