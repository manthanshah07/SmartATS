from django.urls import include, path
from rest_framework.routers import DefaultRouter
from interviews.views import InterviewViewSet

router = DefaultRouter()
router.register(r"interviews", InterviewViewSet, basename="interview")

urlpatterns = [
    path("", include(router.urls)),
]
