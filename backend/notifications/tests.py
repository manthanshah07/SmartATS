from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from notifications.models import Notification


class NotificationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            email="user1@smartats.com",
            password="Password123!",
            role=User.Role.CANDIDATE,
        )
        self.user2 = User.objects.create_user(
            email="user2@smartats.com",
            password="Password123!",
            role=User.Role.CANDIDATE,
        )

        self.notif1 = Notification.objects.create(
            user=self.user1,
            title="Interview Scheduled",
            message="Your technical round is scheduled.",
            is_read=False,
        )
        self.notif2 = Notification.objects.create(
            user=self.user1,
            title="Application Received",
            message="Your application was submitted.",
            is_read=True,
        )
        self.notif_other = Notification.objects.create(
            user=self.user2,
            title="Private Notice",
            message="Confidential alert.",
            is_read=False,
        )

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_list_notifications_for_current_user_only(self):
        self.authenticate(self.user1)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        ids = [n["id"] for n in results]
        self.assertIn(str(self.notif1.id), ids)
        self.assertIn(str(self.notif2.id), ids)
        self.assertNotIn(str(self.notif_other.id), ids)

    def test_filter_unread_notifications(self):
        self.authenticate(self.user1)
        response = self.client.get("/api/notifications/?unread=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.notif1.id))

    def test_mark_single_notification_as_read(self):
        self.authenticate(self.user1)
        response = self.client.post(
            f"/api/notifications/{self.notif1.id}/mark-as-read/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notif1.refresh_from_db()
        self.assertTrue(self.notif1.is_read)

    def test_mark_all_notifications_as_read(self):
        # Create another unread for user1
        Notification.objects.create(
            user=self.user1,
            title="Third Alert",
            message="New alert.",
            is_read=False,
        )
        self.authenticate(self.user1)
        response = self.client.post("/api/notifications/mark-all-read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated_count"], 2)

        # Check in DB
        unread_count = Notification.objects.filter(
            user=self.user1, is_read=False
        ).count()
        self.assertEqual(unread_count, 0)

        # user2 unread should NOT be touched
        self.notif_other.refresh_from_db()
        self.assertFalse(self.notif_other.is_read)

    def test_user_cannot_access_other_users_notification(self):
        self.authenticate(self.user1)
        response = self.client.get(f"/api/notifications/{self.notif_other.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
