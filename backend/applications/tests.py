from unittest.mock import patch
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from applications.models import Application, Resume
from applications.services import ApplicationStateMachine
from jobs.models import Company, Job


class StateMachineTestCase(TestCase):
    def setUp(self):
        self.candidate = User.objects.create_user(
            email="candidate@sm.com",
            password="Password123!",
            role=User.Role.CANDIDATE,
        )
        self.recruiter = User.objects.create_user(
            email="recruiter@sm.com",
            password="Password123!",
            role=User.Role.RECRUITER,
        )
        self.company = Company.objects.create(name="State Tech", is_verified=True)
        self.job = Job.objects.create(
            company=self.company,
            recruiter=self.recruiter,
            title="Systems Engineer",
            description="Systems engineering role.",
        )
        self.resume = Resume.objects.create(
            candidate=self.candidate,
            file=SimpleUploadedFile(
                "resume.pdf", b"%PDF-1.4 dummy", content_type="application/pdf"
            ),
            original_filename="resume.pdf",
            file_size=15,
            mime_type="application/pdf",
        )
        self.app = Application.objects.create(
            job=self.job,
            candidate=self.candidate,
            resume=self.resume,
            status=Application.Status.APPLIED,
        )

    def test_valid_sequential_transitions(self):
        # APPLIED -> SCREENING
        ApplicationStateMachine.transition(
            self.app,
            Application.Status.SCREENING,
            changed_by=self.recruiter,
            notes="Resume screened.",
        )
        self.assertEqual(self.app.status, Application.Status.SCREENING)

        # SCREENING -> SHORTLISTED
        ApplicationStateMachine.transition(
            self.app,
            Application.Status.SHORTLISTED,
            changed_by=self.recruiter,
        )
        self.assertEqual(self.app.status, Application.Status.SHORTLISTED)

        # SHORTLISTED -> INTERVIEW_SCHEDULED
        ApplicationStateMachine.transition(
            self.app,
            Application.Status.INTERVIEW_SCHEDULED,
            changed_by=self.recruiter,
        )
        self.assertEqual(self.app.status, Application.Status.INTERVIEW_SCHEDULED)

        # INTERVIEW_SCHEDULED -> OFFERED
        ApplicationStateMachine.transition(
            self.app,
            Application.Status.OFFERED,
            changed_by=self.recruiter,
        )
        self.assertEqual(self.app.status, Application.Status.OFFERED)

        # OFFERED -> HIRED
        ApplicationStateMachine.transition(
            self.app,
            Application.Status.HIRED,
            changed_by=self.recruiter,
        )
        self.assertEqual(self.app.status, Application.Status.HIRED)

        # Verify audit history length
        self.assertEqual(self.app.status_history.count(), 5)

    def test_invalid_leap_from_applied_to_offered(self):
        with self.assertRaises(ValidationError) as ctx:
            ApplicationStateMachine.transition(
                self.app,
                Application.Status.OFFERED,
                changed_by=self.recruiter,
            )
        self.assertIn("Illegal state transition", str(ctx.exception))

    def test_withdrawal_from_non_final_state(self):
        # APPLIED -> WITHDRAWN
        ApplicationStateMachine.transition(
            self.app,
            Application.Status.WITHDRAWN,
            changed_by=self.candidate,
            notes="Candidate accepted another offer.",
        )
        self.assertEqual(self.app.status, Application.Status.WITHDRAWN)

        # Attempt to transition from terminal WITHDRAWN -> SCREENING should fail
        with self.assertRaises(ValidationError):
            ApplicationStateMachine.transition(
                self.app,
                Application.Status.SCREENING,
                changed_by=self.recruiter,
            )

    def test_rejection_from_screening_state(self):
        ApplicationStateMachine.transition(
            self.app,
            Application.Status.SCREENING,
            changed_by=self.recruiter,
        )
        ApplicationStateMachine.transition(
            self.app,
            Application.Status.REJECTED,
            changed_by=self.recruiter,
            notes="Skills do not match requirements.",
        )
        self.assertEqual(self.app.status, Application.Status.REJECTED)

        # Attempt to transition from terminal REJECTED state
        with self.assertRaises(ValidationError):
            ApplicationStateMachine.transition(
                self.app,
                Application.Status.SHORTLISTED,
                changed_by=self.recruiter,
            )


class ApplicationsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.candidate = User.objects.create_user(
            email="candidate@apptest.com",
            password="Password123!",
            role=User.Role.CANDIDATE,
        )
        self.other_candidate = User.objects.create_user(
            email="other@apptest.com",
            password="Password123!",
            role=User.Role.CANDIDATE,
        )
        self.recruiter = User.objects.create_user(
            email="recruiter@apptest.com",
            password="Password123!",
            role=User.Role.RECRUITER,
        )
        self.unrelated_recruiter = User.objects.create_user(
            email="unrelated@apptest.com",
            password="Password123!",
            role=User.Role.RECRUITER,
        )

        # Companies
        self.company = Company.objects.create(name="Nexus Tech", is_verified=True)
        self.other_company = Company.objects.create(name="Other Corp", is_verified=True)

        # Associate recruiters with companies
        self.recruiter.recruiter_profile.company = self.company
        self.recruiter.recruiter_profile.save()
        self.unrelated_recruiter.recruiter_profile.company = self.other_company
        self.unrelated_recruiter.recruiter_profile.save()

        # Job
        self.job = Job.objects.create(
            company=self.company,
            recruiter=self.recruiter,
            title="Senior Platform Engineer",
            description="Build cloud platforms.",
            is_active=True,
        )

        # Resume for candidate
        self.resume = Resume.objects.create(
            candidate=self.candidate,
            file=SimpleUploadedFile(
                "my_resume.pdf",
                b"%PDF-1.4 dummy",
                content_type="application/pdf",
            ),
            original_filename="my_resume.pdf",
            file_size=15,
            mime_type="application/pdf",
        )

        # Resume for other candidate
        self.other_resume = Resume.objects.create(
            candidate=self.other_candidate,
            file=SimpleUploadedFile(
                "other_resume.pdf",
                b"%PDF-1.4 dummy",
                content_type="application/pdf",
            ),
            original_filename="other_resume.pdf",
            file_size=15,
            mime_type="application/pdf",
        )

    def authenticate(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")

    # 1. Resume Upload Tests
    def test_candidate_resume_upload_success(self):
        self.authenticate(self.candidate)
        pdf_file = SimpleUploadedFile(
            "new_resume.pdf",
            b"%PDF-1.4 real document content",
            content_type="application/pdf",
        )
        res = self.client.post(
            "/api/resumes/",
            {"file": pdf_file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["original_filename"], "new_resume.pdf")
        self.assertEqual(res.data["mime_type"], "application/pdf")
        self.assertGreater(res.data["file_size"], 0)

    def test_resume_upload_invalid_extension(self):
        self.authenticate(self.candidate)
        exe_file = SimpleUploadedFile(
            "malicious.exe",
            b"binary payload",
            content_type="application/x-msdownload",
        )
        res = self.client.post(
            "/api/resumes/",
            {"file": exe_file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", res.data)

    def test_resume_upload_spoofed_pdf_magic_bytes_rejected(self):
        self.authenticate(self.candidate)
        spoofed_pdf = SimpleUploadedFile(
            "spoofed.pdf",
            b"PLAIN_TEXT_NOT_A_REAL_PDF",
            content_type="application/pdf",
        )
        res = self.client.post(
            "/api/resumes/",
            {"file": spoofed_pdf},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", res.data)
        self.assertIn("PDF specification", str(res.data["file"]))

    def test_resume_upload_spoofed_docx_magic_bytes_rejected(self):
        self.authenticate(self.candidate)
        spoofed_docx = SimpleUploadedFile(
            "spoofed.docx",
            b"NOT_A_ZIP_ARCHIVE",
            content_type=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
        )
        res = self.client.post(
            "/api/resumes/",
            {"file": spoofed_docx},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", res.data)
        self.assertIn("Office Open XML specification", str(res.data["file"]))

    def test_resume_upload_valid_docx_magic_bytes_accepted(self):
        self.authenticate(self.candidate)
        valid_docx = SimpleUploadedFile(
            "valid.docx",
            b"PK\x03\x04mock docx archive payload",
            content_type=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
        )
        res = self.client.post(
            "/api/resumes/",
            {"file": valid_docx},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["original_filename"], "valid.docx")

    def test_resume_upload_size_exceeded(self):
        self.authenticate(self.candidate)
        large_content = b"0" * (6 * 1024 * 1024)  # 6MB
        large_file = SimpleUploadedFile(
            "huge_resume.pdf",
            large_content,
            content_type="application/pdf",
        )
        res = self.client.post(
            "/api/resumes/",
            {"file": large_file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", res.data)

    def test_recruiter_cannot_upload_resume(self):
        self.authenticate(self.recruiter)
        pdf_file = SimpleUploadedFile(
            "resume.pdf",
            b"%PDF-1.4 content",
            content_type="application/pdf",
        )
        res = self.client.post(
            "/api/resumes/",
            {"file": pdf_file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # 2. Application Submission Tests
    def test_candidate_apply_success(self):
        self.authenticate(self.candidate)
        res = self.client.post(
            "/api/applications/",
            {
                "job_id": str(self.job.id),
                "resume_id": str(self.resume.id),
                "cover_letter": "I am excited to apply for this position.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "APPLIED")
        self.assertEqual(len(res.data["status_history"]), 1)

    def test_candidate_cannot_use_others_resume(self):
        self.authenticate(self.candidate)
        res = self.client.post(
            "/api/applications/",
            {
                "job_id": str(self.job.id),
                "resume_id": str(self.other_resume.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("resume_id", res.data)

    def test_prevent_duplicate_application(self):
        self.authenticate(self.candidate)
        # First application
        self.client.post(
            "/api/applications/",
            {
                "job_id": str(self.job.id),
                "resume_id": str(self.resume.id),
            },
            format="json",
        )
        # Duplicate application attempt
        res_dup = self.client.post(
            "/api/applications/",
            {
                "job_id": str(self.job.id),
                "resume_id": str(self.resume.id),
            },
            format="json",
        )
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        detail = res_dup.data.get("detail")
        if isinstance(detail, list):
            detail = detail[0]
        self.assertEqual(str(detail), "You have already applied to this position.")

    # 3. RBAC Scoping & Pipeline Stage Tests
    def test_access_scoping_candidate_vs_recruiter(self):
        # Candidate submits an application
        self.authenticate(self.candidate)
        create_res = self.client.post(
            "/api/applications/",
            {
                "job_id": str(self.job.id),
                "resume_id": str(self.resume.id),
            },
            format="json",
        )
        app_id = create_res.data["id"]

        # Candidate can view their application
        cand_list = self.client.get("/api/applications/")
        self.assertEqual(cand_list.status_code, status.HTTP_200_OK)
        results = cand_list.data.get("results", cand_list.data)
        self.assertEqual(len(results), 1)

        # Other candidate cannot view this application
        self.authenticate(self.other_candidate)
        other_list = self.client.get("/api/applications/")
        other_results = other_list.data.get("results", other_list.data)
        self.assertEqual(len(other_results), 0)

        # Unrelated recruiter cannot view application for another company's job
        self.authenticate(self.unrelated_recruiter)
        unrelated_res = self.client.get(f"/api/applications/{app_id}/")
        self.assertEqual(unrelated_res.status_code, status.HTTP_404_NOT_FOUND)

        # Company recruiter can view the application
        self.authenticate(self.recruiter)
        rec_res = self.client.get(f"/api/applications/{app_id}/")
        self.assertEqual(rec_res.status_code, status.HTTP_200_OK)

    def test_recruiter_patch_status_valid_and_invalid(self):
        # Setup application
        app = Application.objects.create(
            job=self.job,
            candidate=self.candidate,
            resume=self.resume,
            status=Application.Status.APPLIED,
        )

        self.authenticate(self.recruiter)

        # 1. Illegal leap APPLIED -> SHORTLISTED should fail
        res_bad = self.client.patch(
            f"/api/applications/{app.id}/",
            {"status": "SHORTLISTED"},
            format="json",
        )
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", res_bad.data)

        # 2. Valid transition APPLIED -> SCREENING should succeed
        res_good = self.client.patch(
            f"/api/applications/{app.id}/",
            {
                "status": "SCREENING",
                "notes": "Candidate passed initial screening.",
            },
            format="json",
        )
        self.assertEqual(res_good.status_code, status.HTTP_200_OK)
        self.assertEqual(res_good.data["status"], "SCREENING")

        app.refresh_from_db()
        self.assertEqual(app.status, Application.Status.SCREENING)
        self.assertEqual(app.status_history.count(), 1)
        self.assertEqual(app.status_history.first().new_status, "SCREENING")

    def test_candidate_withdraw_action(self):
        app = Application.objects.create(
            job=self.job,
            candidate=self.candidate,
            resume=self.resume,
            status=Application.Status.APPLIED,
        )
        self.authenticate(self.candidate)

        res = self.client.post(
            f"/api/applications/{app.id}/withdraw/",
            {"notes": "Withdrawn by candidate due to personal reasons."},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "WITHDRAWN")

        app.refresh_from_db()
        self.assertEqual(app.status, Application.Status.WITHDRAWN)

    def test_candidate_can_withdraw_via_transition_endpoint(self):
        app = Application.objects.create(
            job=self.job,
            candidate=self.candidate,
            resume=self.resume,
            status=Application.Status.APPLIED,
        )
        self.authenticate(self.candidate)

        res = self.client.post(
            f"/api/applications/{app.id}/transition/",
            {"target_stage": "WITHDRAWN", "notes": "No longer interested."},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "WITHDRAWN")

        app.refresh_from_db()
        self.assertEqual(app.status, Application.Status.WITHDRAWN)

    def test_candidate_cannot_transition_to_other_stages(self):
        app = Application.objects.create(
            job=self.job,
            candidate=self.candidate,
            resume=self.resume,
            status=Application.Status.APPLIED,
        )
        self.authenticate(self.candidate)

        res = self.client.post(
            f"/api/applications/{app.id}/transition/",
            {"target_stage": "SHORTLISTED"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn(
            "Candidates can only transition applications to WITHDRAWN",
            res.data["detail"],
        )

    def test_recruiter_analytics_endpoint(self):
        Application.objects.create(
            job=self.job,
            candidate=self.candidate,
            resume=self.resume,
            status=Application.Status.APPLIED,
        )
        self.authenticate(self.recruiter)
        res = self.client.get("/api/analytics/recruiter/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_active_jobs"], 1)
        self.assertEqual(res.data["total_applications"], 1)
        self.assertIn("applicants_per_job", res.data)
        self.assertIn("status_funnel", res.data)
        self.assertEqual(res.data["status_funnel"]["APPLIED"], 1)

    def test_candidate_forbidden_from_analytics(self):
        self.authenticate(self.candidate)
        res = self.client.get("/api/analytics/recruiter/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class AIMatchingPipelineTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.candidate = User.objects.create_user(
            email="ai_candidate@sm.com",
            password="Password123!",
            role=User.Role.CANDIDATE,
        )
        self.recruiter = User.objects.create_user(
            email="ai_recruiter@sm.com",
            password="Password123!",
            role=User.Role.RECRUITER,
        )
        self.company = Company.objects.create(name="Vector AI Corp", is_verified=True)
        self.job = Job.objects.create(
            company=self.company,
            recruiter=self.recruiter,
            title="Senior Python Backend Developer",
            description=(
                "We are looking for a Python and Django expert with Celery, "
                "Redis, and PostgreSQL experience."
            ),
        )
        # Add required & optional skills
        self.job.skills.create(skill_name="Python", is_required=True)
        self.job.skills.create(skill_name="Django", is_required=True)
        self.job.skills.create(skill_name="Docker", is_required=False)

        resume_content = (
            b"Experienced Software Engineer skilled in Python, Django, REST "
            b"APIs, and Docker. Built scalable microservices and backend architectures."
        )
        self.resume = Resume.objects.create(
            candidate=self.candidate,
            file=SimpleUploadedFile(
                "candidate_resume.txt",
                resume_content,
                content_type="text/plain",
            ),
            original_filename="candidate_resume.txt",
            file_size=len(resume_content),
            mime_type="text/plain",
        )

    def test_direct_pipeline_execution(self):
        from applications.models import (
            MatchScore,
            ResumeEmbedding,
            ResumeParsedData,
        )
        from applications.tasks import process_resume_and_match
        from jobs.models import JobEmbedding

        app = Application.objects.create(
            job=self.job,
            candidate=self.candidate,
            resume=self.resume,
            status=Application.Status.APPLIED,
        )

        result_message = process_resume_and_match(str(app.id))
        self.assertIn("Processed application", result_message)

        # 1. ResumeParsedData verified
        parsed_data = ResumeParsedData.objects.get(resume=self.resume)
        self.assertIn("Python", parsed_data.skills)
        self.assertIn("Django", parsed_data.skills)
        self.assertIn("Docker", parsed_data.skills)
        self.assertIn("Experienced Software Engineer", parsed_data.extracted_text)

        # 2. ResumeEmbedding verified (384 dimensions)
        resume_emb = ResumeEmbedding.objects.get(resume=self.resume)
        self.assertEqual(len(resume_emb.embedding), 384)
        self.assertEqual(resume_emb.model_version, "all-MiniLM-L6-v2")

        # 3. JobEmbedding verified (384 dimensions)
        job_emb = JobEmbedding.objects.get(job=self.job)
        self.assertEqual(len(job_emb.embedding), 384)

        # 4. MatchScore verified
        match_score = MatchScore.objects.get(application=app)
        self.assertGreaterEqual(match_score.overall_score, 0.0)
        self.assertLessEqual(match_score.overall_score, 100.0)
        self.assertGreaterEqual(match_score.semantic_score, 0.0)
        self.assertLessEqual(match_score.semantic_score, 100.0)
        self.assertEqual(match_score.skill_overlap_score, 100.0)
        self.assertIn("Python", match_score.matched_skills)
        self.assertIn("Django", match_score.matched_skills)
        self.assertIn("Docker", match_score.matched_skills)
        self.assertEqual(len(match_score.missing_skills), 0)

        # Expected formula verification
        expected_overall = round(
            0.65 * float(match_score.semantic_score)
            + 0.35 * float(match_score.skill_overlap_score),
            2,
        )
        self.assertAlmostEqual(
            float(match_score.overall_score), expected_overall, places=1
        )

    def test_api_create_application_triggers_matching_and_returns_match_score(self):
        refresh = RefreshToken.for_user(self.candidate)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Post application creation
        response = self.client.post(
            "/api/applications/",
            {
                "job_id": str(self.job.id),
                "resume_id": str(self.resume.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        app_id = response.data["id"]

        # In eager mode, matching runs synchronously upon delay() call
        app = Application.objects.get(id=app_id)
        self.assertTrue(hasattr(app, "match_score"))

        # Recruiter retrieves application detail and sees match_score explainability
        recruiter_refresh = RefreshToken.for_user(self.recruiter)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {recruiter_refresh.access_token}"
        )

        get_res = self.client.get(f"/api/applications/{app_id}/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertIn("match_score", get_res.data)
        match_data = get_res.data["match_score"]
        self.assertIsNotNone(match_data)
        self.assertIn("overall_score", match_data)
        self.assertIn("semantic_score", match_data)
        self.assertIn("skill_overlap_score", match_data)
        self.assertIn("matched_skills", match_data)
        self.assertIn("missing_skills", match_data)
        self.assertIn("Python", match_data["matched_skills"])

    @patch("applications.tasks.process_resume_and_match.delay")
    def test_mock_celery_task_triggered_on_application_creation(self, mock_task):
        refresh = RefreshToken.for_user(self.candidate)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.post(
            "/api/applications/",
            {
                "job_id": str(self.job.id),
                "resume_id": str(self.resume.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_task.assert_called_once_with(response.data["id"])

    @patch("applications.tasks.generate_dense_embedding")
    def test_mock_embedding_generation(self, mock_embedding):
        from applications.models import MatchScore
        from applications.tasks import process_resume_and_match

        # Provide a synthetic 384-dimensional vector
        mock_embedding.return_value = [0.05] * 384

        app = Application.objects.create(
            job=self.job,
            candidate=self.candidate,
            resume=self.resume,
            status=Application.Status.APPLIED,
        )

        result_message = process_resume_and_match(str(app.id))
        self.assertIn("Processed application", result_message)
        self.assertTrue(mock_embedding.called)

        match_score = MatchScore.objects.get(application=app)
        self.assertIsNotNone(match_score)
        self.assertGreater(float(match_score.overall_score), 0.0)
