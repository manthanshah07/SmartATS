import redis
from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


@api_view(["GET"])
@permission_classes([AllowAny])
def healthz(request):
    """
    Production health check endpoint verifying PostgreSQL and Redis connectivity.
    """
    status_data = {
        "status": "healthy",
        "database": "up",
        "redis": "up",
    }
    status_code = 200

    # 1. Verify database connection
    try:
        connection.ensure_connection()
    except Exception as e:
        status_data["database"] = f"down: {str(e)}"
        status_data["status"] = "unhealthy"
        status_code = 503

    # 2. Ping Redis broker / cache
    try:
        redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
        client = redis.from_url(redis_url, socket_timeout=2)
        client.ping()
    except Exception as e:
        status_data["redis"] = f"down: {str(e)}"
        status_data["status"] = "unhealthy"
        status_code = 503

    return JsonResponse(status_data, status=status_code)
