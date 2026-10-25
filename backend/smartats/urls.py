"""
URL configuration for smartats project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from applications.views import RecruiterAnalyticsViewSet
from smartats.views import healthz

urlpatterns = [
    path("healthz", healthz, name="healthz"),
    path("healthz/", healthz, name="healthz-slash"),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("jobs.urls")),
    path("api/", include("applications.urls")),
    path("api/", include("interviews.urls")),
    path("api/", include("notifications.urls")),
    path(
        "api/analytics/recruiter/",
        RecruiterAnalyticsViewSet.as_view({"get": "list"}),
        name="recruiter-analytics",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
