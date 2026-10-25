from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from notifications.models import Notification
from notifications.serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and managing user notifications.
    Users can only view and mutate their own notifications.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "is_read"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user)
        unread_only = self.request.query_params.get("unread")
        if unread_only is not None and unread_only.lower() in ["true", "1"]:
            queryset = queryset.filter(is_read=False)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post", "patch"], url_path="mark-as-read")
    def mark_as_read(self, request, pk=None):
        """Marks a single notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(
            {
                "detail": "Notification marked as read.",
                "notification": self.get_serializer(notification).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_as_read(self, request):
        """Marks all unread notifications for the current user as read."""
        updated_count = Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)
        return Response(
            {
                "detail": f"{updated_count} notification(s) marked as read.",
                "updated_count": updated_count,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        """Alias for mark-all-read."""
        return self.mark_all_as_read(request)
