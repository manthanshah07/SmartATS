import django_filters
from applications.models import Application


class ApplicationFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(
        field_name="status", choices=Application.Status.choices
    )
    job_id = django_filters.UUIDFilter(field_name="job__id")
    candidate_id = django_filters.UUIDFilter(field_name="candidate__id")

    class Meta:
        model = Application
        fields = ["status", "job_id", "candidate_id"]
