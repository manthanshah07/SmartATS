import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from accounts.permissions import (
    IsAdminUser,
    IsCandidate,
    IsOwnerOrReadOnly,
    IsRecruiter,
)
from accounts.serializers import CustomTokenObtainPairSerializer


class DummyObject:
    """Mock object with user attribute for permission testing."""

    def __init__(self, user):
        self.user = user


class MockRequest:
    """Mock DRF request for permission unit tests."""

    def __init__(self, user, method="GET"):
        self.user = user
        self.method = method


class UserModelTestCase(TestCase):
    def test_create_candidate_user(self):
        user = User.objects.create_user(
            email="candidate@example.com",
            password="StrongPassword123!",
            role=User.Role.CANDIDATE,
            first_name="Jane",
            last_name="Doe",
        )
        self.assertEqual(user.email, "candidate@example.com")
        self.assertEqual(user.role, User.Role.CANDIDATE)
        self.assertTrue(user.is_candidate)
        self.assertFalse(user.is_recruiter)
        self.assertFalse(user.is_admin_role)
        self.assertTrue(user.check_password("StrongPassword123!"))
        # Verify signal created candidate profile
        self.assertTrue(hasattr(user, "candidate_profile"))
        self.assertEqual(user.candidate_profile.first_name, "Jane")

    def test_create_recruiter_user(self):
        user = User.objects.create_user(
            email="recruiter@example.com",
            password="StrongPassword123!",
            role=User.Role.RECRUITER,
        )
        self.assertEqual(user.role, User.Role.RECRUITER)
        self.assertTrue(user.is_recruiter)
        self.assertFalse(user.is_candidate)
        # Verify signal created recruiter profile
        self.assertTrue(hasattr(user, "recruiter_profile"))

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email="admin@example.com",
            password="AdminPassword123!",
        )
        self.assertEqual(admin.role, User.Role.ADMIN)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_admin_role)

    def test_email_required(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="password123")


class RBACPermissionsTestCase(TestCase):
    def setUp(self):
        self.candidate = User.objects.create_user(
            email="c@example.com",
            password="password123",
            role=User.Role.CANDIDATE,
        )
        self.recruiter = User.objects.create_user(
            email="r@example.com",
            password="password123",
            role=User.Role.RECRUITER,
        )
        self.admin = User.objects.create_user(
            email="a@example.com",
            password="password123",
            role=User.Role.ADMIN,
            is_staff=True,
        )

    def test_is_candidate_permission(self):
        perm = IsCandidate()
        req_cand = MockRequest(self.candidate)
        req_rec = MockRequest(self.recruiter)
        req_admin = MockRequest(self.admin)

        self.assertTrue(perm.has_permission(req_cand, None))
        self.assertFalse(perm.has_permission(req_rec, None))
        self.assertFalse(perm.has_permission(req_admin, None))

    def test_is_recruiter_permission(self):
        perm = IsRecruiter()
        req_cand = MockRequest(self.candidate)
        req_rec = MockRequest(self.recruiter)
        req_admin = MockRequest(self.admin)

        self.assertFalse(perm.has_permission(req_cand, None))
        self.assertTrue(perm.has_permission(req_rec, None))
        self.assertFalse(perm.has_permission(req_admin, None))

    def test_is_admin_permission(self):
        perm = IsAdminUser()
        req_cand = MockRequest(self.candidate)
        req_rec = MockRequest(self.recruiter)
        req_admin = MockRequest(self.admin)

        self.assertFalse(perm.has_permission(req_cand, None))
        self.assertFalse(perm.has_permission(req_rec, None))
        self.assertTrue(perm.has_permission(req_admin, None))

    def test_is_owner_or_read_only_permission(self):
        perm = IsOwnerOrReadOnly()
        cand_obj = DummyObject(self.candidate)

        # Safe method (GET) allows any user
        req_get = MockRequest(self.recruiter, method="GET")
        self.assertTrue(perm.has_object_permission(req_get, None, cand_obj))

        # Write method (PUT) allows only owner
        req_put_owner = MockRequest(self.candidate, method="PUT")
        req_put_other = MockRequest(self.recruiter, method="PUT")
        self.assertTrue(perm.has_object_permission(req_put_owner, None, cand_obj))
        self.assertFalse(perm.has_object_permission(req_put_other, None, cand_obj))


class AuthAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.candidate = User.objects.create_user(
            email="candidate@test.com",
            password="CandidatePass123!",
            role=User.Role.CANDIDATE,
            first_name="Alice",
            last_name="Smith",
        )
        self.recruiter = User.objects.create_user(
            email="recruiter@test.com",
            password="RecruiterPass123!",
            role=User.Role.RECRUITER,
        )

    def test_custom_jwt_claims(self):
        serializer = CustomTokenObtainPairSerializer()
        token = serializer.get_token(self.candidate)

        # Decode token payload
        payload = jwt.decode(
            str(token),
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
        self.assertEqual(payload["email"], "candidate@test.com")
        self.assertEqual(payload["role"], User.Role.CANDIDATE)
        self.assertEqual(payload["user_id"], str(self.candidate.id))

    def test_login_success(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "email": "candidate@test.com",
                "password": "CandidatePass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "candidate@test.com")
        self.assertEqual(response.data["user"]["role"], User.Role.CANDIDATE)

    def test_login_invalid_credentials(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "email": "candidate@test.com",
                "password": "WrongPassword!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        login_res = self.client.post(
            "/api/auth/login/",
            {
                "email": "candidate@test.com",
                "password": "CandidatePass123!",
            },
            format="json",
        )
        refresh_token = login_res.data["refresh"]

        refresh_res = self.client.post(
            "/api/auth/refresh/",
            {"refresh": refresh_token},
            format="json",
        )
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_res.data)

    def test_logout_and_token_blacklisting(self):
        # 1. Login to get refresh token
        login_res = self.client.post(
            "/api/auth/login/",
            {
                "email": "candidate@test.com",
                "password": "CandidatePass123!",
            },
            format="json",
        )
        access_token = login_res.data["access"]
        refresh_token = login_res.data["refresh"]

        # 2. Authenticate client and logout
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_res = self.client.post(
            "/api/auth/logout/",
            {"refresh": refresh_token},
            format="json",
        )
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)
        self.assertIn("blacklisted", logout_res.data["detail"])

        # 3. Attempt to use the blacklisted refresh token
        refresh_res = self.client.post(
            "/api/auth/refresh/",
            {"refresh": refresh_token},
            format="json",
        )
        self.assertEqual(refresh_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_candidate_registration(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "newcandidate@test.com",
                "password": "SecurePassword987!",
                "role": "CANDIDATE",
                "first_name": "Bob",
                "last_name": "Johnson",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "newcandidate@test.com")
        self.assertEqual(response.data["user"]["role"], "CANDIDATE")

        user = User.objects.get(email="newcandidate@test.com")
        self.assertTrue(hasattr(user, "candidate_profile"))
        self.assertEqual(user.candidate_profile.first_name, "Bob")

    def test_recruiter_registration(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "newrecruiter@test.com",
                "password": "SecurePassword987!",
                "role": "RECRUITER",
                "company_name": "Acme Corp",
                "title": "Head of Talent",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], "RECRUITER")

        user = User.objects.get(email="newrecruiter@test.com")
        self.assertTrue(hasattr(user, "recruiter_profile"))
        self.assertEqual(user.recruiter_profile.company_name, "Acme Corp")
        self.assertEqual(user.recruiter_profile.title, "Head of Talent")

    def test_user_me_endpoint(self):
        # Authenticate as candidate
        login_res = self.client.post(
            "/api/auth/login/",
            {
                "email": "candidate@test.com",
                "password": "CandidatePass123!",
            },
            format="json",
        )
        access_token = login_res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # GET /api/auth/me/
        me_res = self.client.get("/api/auth/me/")
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data["email"], "candidate@test.com")
        self.assertIn("candidate_profile", me_res.data)

        # PATCH /api/auth/me/
        update_res = self.client.patch(
            "/api/auth/me/",
            {
                "candidate_profile": {
                    "headline": "Full-stack Engineer",
                    "location": "San Francisco, CA",
                }
            },
            format="json",
        )
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.candidate.refresh_from_db()
        self.assertEqual(
            self.candidate.candidate_profile.headline, "Full-stack Engineer"
        )
        self.assertEqual(self.candidate.candidate_profile.location, "San Francisco, CA")
