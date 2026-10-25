from django.urls import include, path
from rest_framework.routers import DefaultRouter
from applications.views import (
    ApplicationViewSet,
    RecruiterAnalyticsViewSet,
    ResumeViewSet,
)

router = DefaultRouter()
router.register(r"resumes", ResumeViewSet, basename="resume")
router.register(r"applications", ApplicationViewSet, basename="application")
router.register(
    r"analytics/recruiter", RecruiterAnalyticsViewSet, basename="recruiter-analytics"
)

urlpatterns = [
    path("", include(router.urls)),
]
