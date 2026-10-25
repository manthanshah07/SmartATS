from django.urls import include, path
from rest_framework.routers import DefaultRouter
from jobs.views import CompanyViewSet, JobSkillViewSet, JobViewSet

router = DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"jobs", JobViewSet, basename="job")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "jobs/<uuid:job_id>/skills/",
        JobSkillViewSet.as_view({"get": "list", "post": "create"}),
        name="job-skills-list",
    ),
    path(
        "jobs/<uuid:job_id>/skills/<uuid:pk>/",
        JobSkillViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="job-skills-detail",
    ),
]
