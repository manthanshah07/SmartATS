from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from jobs.models import Company, Job, JobSkill


class JobsModelTestCase(TestCase):
    def setUp(self):
        self.recruiter = User.objects.create_user(
            email="recruiter@models.com",
            password="Password123!",
            role=User.Role.RECRUITER,
        )

    def test_company_creation_and_auto_slug(self):
        company = Company.objects.create(
            name="Alpha Corp",
            website="https://alpha.example.com",
            industry="Software",
        )
        self.assertEqual(company.slug, "alpha-corp")
        self.assertFalse(company.is_verified)
        self.assertEqual(str(company), "Alpha Corp (Unverified)")

        # Verify duplicate name collision handling for slug
        company2 = Company.objects.create(
            name="Alpha Corp 2",
            industry="Hardware",
        )
        self.assertTrue(company2.slug.startswith("alpha-corp"))

    def test_job_and_skills_creation(self):
        company = Company.objects.create(
            name="Beta Tech",
            is_verified=True,
        )
        job = Job.objects.create(
            company=company,
            recruiter=self.recruiter,
            title="Senior Backend Engineer",
            job_type=Job.JobType.FULL_TIME,
            location="Remote",
            department="Engineering",
            salary_min=120000,
            salary_max=160000,
            description="Build scalable distributed systems.",
        )
        self.assertTrue(job.slug.startswith("beta-tech-senior-backend-engineer"))
        self.assertTrue(job.is_active)

        skill1 = JobSkill.objects.create(
            job=job,
            skill_name="Python",
            is_required=True,
        )
        skill2 = JobSkill.objects.create(
            job=job,
            skill_name="Docker",
            is_required=False,
        )
        self.assertEqual(job.skills.count(), 2)
        self.assertTrue(skill1.is_required)
        self.assertFalse(skill2.is_required)
        self.assertIn("Required", str(skill1))
        self.assertIn("Preferred", str(skill2))


class JobsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.candidate = User.objects.create_user(
            email="candidate@jobs.com",
            password="Password123!",
            role=User.Role.CANDIDATE,
        )
        self.recruiter_1 = User.objects.create_user(
            email="recruiter1@jobs.com",
            password="Password123!",
            role=User.Role.RECRUITER,
        )
        self.recruiter_2 = User.objects.create_user(
            email="recruiter2@jobs.com",
            password="Password123!",
            role=User.Role.RECRUITER,
        )
        self.admin = User.objects.create_superuser(
            email="admin@jobs.com",
            password="AdminPassword123!",
        )

        # Companies
        self.verified_company = Company.objects.create(
            name="Verified Tech Inc",
            is_verified=True,
            industry="Cloud Computing",
        )
        self.unverified_company = Company.objects.create(
            name="Startup Labs",
            is_verified=False,
            industry="Fintech",
        )

        # Seed Jobs
        self.active_job_1 = Job.objects.create(
            company=self.verified_company,
            recruiter=self.recruiter_1,
            title="Python Django Developer",
            job_type=Job.JobType.FULL_TIME,
            location="San Francisco, CA",
            department="Engineering",
            salary_min=110000,
            salary_max=140000,
            description="Exciting role building web APIs with Django and PostgreSQL.",
            is_active=True,
        )
        JobSkill.objects.create(
            job=self.active_job_1,
            skill_name="Django",
            is_required=True,
        )
        JobSkill.objects.create(
            job=self.active_job_1,
            skill_name="PostgreSQL",
            is_required=True,
        )

        self.active_job_2 = Job.objects.create(
            company=self.verified_company,
            recruiter=self.recruiter_1,
            title="Frontend React Engineer",
            job_type=Job.JobType.REMOTE,
            location="Remote",
            department="Design",
            salary_min=95000,
            salary_max=125000,
            description=("Crafting elegant user interfaces using React and Tailwind."),
            is_active=True,
        )
        JobSkill.objects.create(
            job=self.active_job_2,
            skill_name="React",
            is_required=True,
        )

        self.inactive_job = Job.objects.create(
            company=self.verified_company,
            recruiter=self.recruiter_1,
            title="Closed Architect Position",
            job_type=Job.JobType.CONTRACT,
            location="New York, NY",
            department="Architecture",
            salary_min=150000,
            salary_max=200000,
            description="Position is now filled.",
            is_active=False,
        )

    def authenticate(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")

    # 1. Access Control Tests
    def test_anonymous_and_candidate_read_active_jobs(self):
        # Anonymous GET /api/jobs/
        res = self.client.get("/api/jobs/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should only see active jobs (2 of 3)
        results = res.data.get("results", res.data)
        self.assertEqual(len(results), 2)
        job_ids = [j["id"] for j in results]
        self.assertNotIn(str(self.inactive_job.id), job_ids)

        # Candidate GET /api/jobs/
        self.authenticate(self.candidate)
        res_cand = self.client.get("/api/jobs/")
        self.assertEqual(res_cand.status_code, status.HTTP_200_OK)
        results_cand = res_cand.data.get("results", res_cand.data)
        self.assertEqual(len(results_cand), 2)

    def test_candidate_cannot_create_job(self):
        self.authenticate(self.candidate)
        res = self.client.post(
            "/api/jobs/",
            {
                "title": "Unauthorized Job",
                "company_id": str(self.verified_company.id),
                "description": "Candidate should not be allowed.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_create_job(self):
        self.client.credentials()  # Clear auth
        res = self.client.post(
            "/api/jobs/",
            {
                "title": "Anonymous Job",
                "company_id": str(self.verified_company.id),
                "description": "Anon should not be allowed.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_recruiter_cannot_post_for_unverified_company(self):
        self.authenticate(self.recruiter_1)
        res = self.client.post(
            "/api/jobs/",
            {
                "title": "Unverified Company Job",
                "company_id": str(self.unverified_company.id),
                "description": "This should fail because company is unverified.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("company", res.data)

    def test_admin_can_verify_company(self):
        self.authenticate(self.admin)
        res = self.client.post(f"/api/companies/{self.unverified_company.id}/verify/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.unverified_company.refresh_from_db()
        self.assertTrue(self.unverified_company.is_verified)

    def test_recruiter_can_post_for_verified_company(self):
        self.authenticate(self.recruiter_1)
        payload = {
            "title": "DevOps Engineer",
            "company_id": str(self.verified_company.id),
            "job_type": "FULL_TIME",
            "location": "Austin, TX",
            "department": "Infrastructure",
            "salary_min": "130000.00",
            "salary_max": "170000.00",
            "description": "Manage Kubernetes clusters and CI/CD pipelines.",
            "skills": [
                {"skill_name": "Kubernetes", "is_required": True},
                {"skill_name": "Terraform", "is_required": False},
            ],
        }
        res = self.client.post("/api/jobs/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "DevOps Engineer")
        self.assertEqual(len(res.data["skills"]), 2)
        self.assertEqual(res.data["recruiter_email"], self.recruiter_1.email)

    def test_recruiter_cannot_post_for_different_company(self):
        # Assign recruiter_1 to verified_company
        self.recruiter_1.recruiter_profile.company = self.verified_company
        self.recruiter_1.recruiter_profile.save()

        other_company = Company.objects.create(
            name="Other Corp",
            is_verified=True,
        )

        self.authenticate(self.recruiter_1)
        res = self.client.post(
            "/api/jobs/",
            {
                "title": "Unauthorized Cross-Tenant Job",
                "company_id": str(other_company.id),
                "description": "Should fail tenant isolation.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("company", res.data)

    def test_job_owner_restrictions(self):
        # Recruiter 2 tries to update Recruiter 1's job
        self.authenticate(self.recruiter_2)
        res = self.client.patch(
            f"/api/jobs/{self.active_job_1.id}/",
            {"title": "Hacked Title"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Recruiter 1 updates their own job
        self.authenticate(self.recruiter_1)
        res_ok = self.client.patch(
            f"/api/jobs/{self.active_job_1.id}/",
            {"title": "Senior Python Django Developer"},
            format="json",
        )
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.active_job_1.refresh_from_db()
        self.assertEqual(self.active_job_1.title, "Senior Python Django Developer")

    # 2. Multi-Facet Filtering & Search Tests
    def test_filter_by_location(self):
        res = self.client.get("/api/jobs/?location=San Francisco")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.active_job_1.id))

    def test_filter_by_job_type(self):
        res = self.client.get("/api/jobs/?job_type=REMOTE")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.active_job_2.id))

    def test_filter_by_department(self):
        res = self.client.get("/api/jobs/?department=Design")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.active_job_2.id))

    def test_filter_by_salary_range(self):
        res = self.client.get("/api/jobs/?salary_min=120000&salary_max=150000")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        # active_job_1 (salary_min=110k) doesn't match min 120k,
        # so results should be empty
        self.assertEqual(len(results), 0)

        res2 = self.client.get("/api/jobs/?salary_min=90000&salary_max=130000")
        results2 = res2.data.get("results", res2.data)
        self.assertEqual(len(results2), 1)
        self.assertEqual(results2[0]["id"], str(self.active_job_2.id))

    def test_full_text_search(self):
        # Search by keyword matching title/description
        res_django = self.client.get("/api/jobs/?search=Django")
        self.assertEqual(res_django.status_code, status.HTTP_200_OK)
        results = res_django.data.get("results", res_django.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.active_job_1.id))

        # Search by keyword matching skills
        res_react = self.client.get("/api/jobs/?search=React")
        self.assertEqual(res_react.status_code, status.HTTP_200_OK)
        results_react = res_react.data.get("results", res_react.data)
        self.assertEqual(len(results_react), 1)
        self.assertEqual(results_react[0]["id"], str(self.active_job_2.id))
