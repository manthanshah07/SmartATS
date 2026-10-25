from unittest.mock import MagicMock, patch
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class HealthCheckTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("smartats.views.redis.from_url")
    def test_healthz_healthy(self, mock_redis_from_url):
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        mock_redis_from_url.return_value = mock_client

        response = self.client.get("/healthz")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["database"], "up")
        self.assertEqual(data["redis"], "up")

    @patch("smartats.views.redis.from_url")
    def test_healthz_redis_down(self, mock_redis_from_url):
        mock_client = MagicMock()
        mock_client.ping.side_effect = Exception("Connection refused")
        mock_redis_from_url.return_value = mock_client

        response = self.client.get("/healthz")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        data = response.json()
        self.assertEqual(data["status"], "unhealthy")
        self.assertEqual(data["database"], "up")
        self.assertIn("down", data["redis"])
