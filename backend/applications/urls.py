from django.urls import include, path
from rest_framework.routers import DefaultRouter
from applications.views import ApplicationViewSet, ResumeViewSet

router = DefaultRouter()
router.register(r"resumes", ResumeViewSet, basename="resume")
router.register(r"applications", ApplicationViewSet, basename="application")

urlpatterns = [
    path("", include(router.urls)),
]
