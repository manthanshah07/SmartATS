from datetime import datetime, timedelta, timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from applications.models import Application, Resume
from applications.services import ApplicationStateMachine
from interviews.models import Interview
from jobs.models import Company, Job
from notifications.models import Notification


class InterviewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.candidate = User.objects.create_user(
            email="candidate1@smartats.com",
            password="Password123!",
            role=User.Role.CANDIDATE,
        )
        self.other_candidate = User.objects.create_user(
            email="candidate2@smartats.com",
            password="Password123!",
            role=User.Role.CANDIDATE,
        )
        self.recruiter = User.objects.create_user(
            email="recruiter1@smartats.com",
            password="Password123!",
            role=User.Role.RECRUITER,
        )
        self.admin = User.objects.create_user(
            email="admin@smartats.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )

        # Company & Job
        self.company = Company.objects.create(name="Tech Innovators", is_verified=True)
        self.job = Job.objects.create(
            company=self.company,
            recruiter=self.recruiter,
            title="Senior Full-Stack Engineer",
            description="Leading full-stack engineering initiatives.",
            is_active=True,
        )

        # Resumes & Applications
        self.resume1 = Resume.objects.create(
            candidate=self.candidate,
            file=SimpleUploadedFile(
                "c1_resume.pdf", b"%PDF-1.4 mock", "application/pdf"
            ),
            original_filename="c1_resume.pdf",
            file_size=12,
            mime_type="application/pdf",
        )
        self.app1 = Application.objects.create(
            job=self.job,
            candidate=self.candidate,
            resume=self.resume1,
            status=Application.Status.SHORTLISTED,
        )

        self.resume2 = Resume.objects.create(
            candidate=self.other_candidate,
            file=SimpleUploadedFile(
                "c2_resume.pdf", b"%PDF-1.4 mock", "application/pdf"
            ),
            original_filename="c2_resume.pdf",
            file_size=12,
            mime_type="application/pdf",
        )
        self.app2 = Application.objects.create(
            job=self.job,
            candidate=self.other_candidate,
            resume=self.resume2,
            status=Application.Status.APPLIED,
        )

        self.start_time = datetime.now(timezone.utc) + timedelta(days=2)
        self.end_time = self.start_time + timedelta(hours=1)

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_recruiter_can_schedule_interview_and_creates_notification(self):
        self.authenticate(self.recruiter)
        payload = {
            "application_id": str(self.app1.id),
            "round_name": "Technical Architecture",
            "scheduled_start": self.start_time.isoformat(),
            "scheduled_end": self.end_time.isoformat(),
            "meeting_url": "https://meet.google.com/abc-defg-hij",
        }
        response = self.client.post("/api/interviews/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        interview_id = response.data["id"]

        # Verify created interview
        interview = Interview.objects.get(id=interview_id)
        self.assertEqual(interview.round_name, "Technical Architecture")
        self.assertEqual(interview.status, Interview.Status.SCHEDULED)
        self.assertEqual(interview.recruiter, self.recruiter)

        # Verify automated candidate notification was created
        notif = Notification.objects.filter(
            user=self.candidate,
            title__icontains="Technical Architecture",
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn("Senior Full-Stack Engineer", notif.message)
        self.assertFalse(notif.is_read)

    def test_candidate_cannot_schedule_interview(self):
        self.authenticate(self.candidate)
        payload = {
            "application_id": str(self.app1.id),
            "round_name": "Self Scheduled Round",
            "scheduled_start": self.start_time.isoformat(),
            "scheduled_end": self.end_time.isoformat(),
        }
        response = self.client.post("/api/interviews/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_candidate_can_only_view_own_interviews(self):
        # Create interview for candidate 1
        interview1 = Interview.objects.create(
            application=self.app1,
            recruiter=self.recruiter,
            round_name="Round 1",
            scheduled_start=self.start_time,
            scheduled_end=self.end_time,
        )
        # Create interview for candidate 2
        Interview.objects.create(
            application=self.app2,
            recruiter=self.recruiter,
            round_name="Round 2",
            scheduled_start=self.start_time,
            scheduled_end=self.end_time,
        )

        self.authenticate(self.candidate)
        response = self.client.get("/api/interviews/")
        # Candidate 1 must only see interview1
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(interview1.id))

    def test_generate_ics_calendar_invitation(self):
        interview = Interview.objects.create(
            application=self.app1,
            recruiter=self.recruiter,
            round_name="Final Behavioral",
            scheduled_start=self.start_time,
            scheduled_end=self.end_time,
            meeting_url="https://meet.smartats.com/final-round",
        )

        self.authenticate(self.candidate)
        response = self.client.get(f"/api/interviews/{interview.id}/ics/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/calendar; charset=utf-8")
        self.assertIn(
            f'attachment; filename="interview-{interview.id}.ics"',
            response["Content-Disposition"],
        )

        content = response.content.decode("utf-8")
        self.assertIn("BEGIN:VCALENDAR", content)
        self.assertIn("BEGIN:VEVENT", content)
        self.assertIn(f"UID:interview-{interview.id}@smartats.com", content)
        self.assertIn("SUMMARY:Interview: Final Behavioral", content)
        self.assertIn("STATUS:SCHEDULED", content)
        self.assertIn("END:VEVENT", content)
        self.assertIn("END:VCALENDAR", content)

    def test_recruiter_feedback_and_rating_update(self):
        interview = Interview.objects.create(
            application=self.app1,
            recruiter=self.recruiter,
            round_name="Coding Round",
            scheduled_start=self.start_time,
            scheduled_end=self.end_time,
        )

        self.authenticate(self.recruiter)
        patch_payload = {
            "status": "COMPLETED",
            "feedback": "Exceptional problem solving and clean algorithm design.",
            "rating": 5,
        }
        response = self.client.patch(
            f"/api/interviews/{interview.id}/", patch_payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "COMPLETED")
        self.assertEqual(response.data["rating"], 5)

        interview.refresh_from_db()
        self.assertEqual(interview.status, Interview.Status.COMPLETED)
        self.assertEqual(interview.rating, 5)

    def test_interview_validation_rules(self):
        self.authenticate(self.recruiter)

        # Invalid: end before start
        bad_times_payload = {
            "application_id": str(self.app1.id),
            "round_name": "Invalid Times",
            "scheduled_start": self.end_time.isoformat(),
            "scheduled_end": self.start_time.isoformat(),
        }
        res_bad_times = self.client.post(
            "/api/interviews/", bad_times_payload, format="json"
        )
        self.assertEqual(res_bad_times.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scheduled_end", res_bad_times.data)

        # Invalid: rating > 5
        interview = Interview.objects.create(
            application=self.app1,
            recruiter=self.recruiter,
            round_name="Coding",
            scheduled_start=self.start_time,
            scheduled_end=self.end_time,
        )
        res_bad_rating = self.client.patch(
            f"/api/interviews/{interview.id}/", {"rating": 6}, format="json"
        )
        self.assertEqual(res_bad_rating.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rating", res_bad_rating.data)


class RecruiterAnalyticsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.recruiter = User.objects.create_user(
            email="analytics_recruiter@smartats.com",
            password="Password123!",
            role=User.Role.RECRUITER,
        )
        self.candidate = User.objects.create_user(
            email="analytics_candidate@smartats.com",
            password="Password123!",
            role=User.Role.CANDIDATE,
        )
        self.admin = User.objects.create_user(
            email="analytics_admin@smartats.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )

        self.company = Company.objects.create(name="Analytics Corp", is_verified=True)
        self.job1 = Job.objects.create(
            company=self.company,
            recruiter=self.recruiter,
            title="Backend Lead",
            is_active=True,
        )
        self.job2 = Job.objects.create(
            company=self.company,
            recruiter=self.recruiter,
            title="Frontend Specialist",
            is_active=True,
        )

        # Applications
        self.resume = Resume.objects.create(
            candidate=self.candidate,
            file=SimpleUploadedFile("resume.pdf", b"%PDF mock", "application/pdf"),
            original_filename="resume.pdf",
            file_size=10,
            mime_type="application/pdf",
        )
        self.app1 = Application.objects.create(
            job=self.job1,
            candidate=self.candidate,
            resume=self.resume,
            status=Application.Status.APPLIED,
        )

        # Simulate progression for app1 to OFFERED
        ApplicationStateMachine.transition(
            self.app1, Application.Status.SCREENING, changed_by=self.recruiter
        )
        ApplicationStateMachine.transition(
            self.app1, Application.Status.SHORTLISTED, changed_by=self.recruiter
        )
        ApplicationStateMachine.transition(
            self.app1, Application.Status.INTERVIEW_SCHEDULED, changed_by=self.recruiter
        )
        ApplicationStateMachine.transition(
            self.app1, Application.Status.OFFERED, changed_by=self.recruiter
        )

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_recruiter_analytics_endpoint(self):
        self.authenticate(self.recruiter)
        response = self.client.get("/api/analytics/recruiter/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertEqual(data["total_active_jobs"], 2)
        self.assertEqual(data["total_applications"], 1)

        # Check applicants per job
        applicants_per_job = {
            j["job_title"]: j["total_applicants"] for j in data["applicants_per_job"]
        }
        self.assertEqual(applicants_per_job["Backend Lead"], 1)
        self.assertEqual(applicants_per_job["Frontend Specialist"], 0)

        # Check funnel counts
        funnel = data["status_funnel"]
        self.assertEqual(funnel["OFFERED"], 1)
        self.assertEqual(funnel["APPLIED"], 0)

        # Check average time to hire exists
        self.assertIn("average_time_to_hire_days", data)
        self.assertGreaterEqual(data["average_time_to_hire_days"], 0.0)

        # Check time in stage exists
        self.assertIn("average_time_in_stage_days", data)

    def test_candidate_forbidden_from_analytics(self):
        self.authenticate(self.candidate)
        response = self.client.get("/api/analytics/recruiter/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_analytics(self):
        self.authenticate(self.admin)
        response = self.client.get("/api/analytics/recruiter/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
