import decimal
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import CandidateProfile, RecruiterProfile, User
from applications.models import Application, MatchScore, Resume
from jobs.models import Company, Job, JobSkill


class Command(BaseCommand):
    help = (
        "Seeds the database with realistic companies, recruiters, candidates, "
        "jobs, and applications with AI match scores."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting SmartATS database seeding..."))

        # -------------------------------------------------------------
        # 1. SEED COMPANIES
        # -------------------------------------------------------------
        companies_data = [
            {
                "name": "TechNova Solutions",
                "industry": "Enterprise Cloud & AI",
                "website": "https://technova.io",
                "logo_url": (
                    "https://images.unsplash.com/photo-1549923746-c502d488b3ea"
                    "?w=128&h=128&fit=crop"
                ),
                "description": (
                    "TechNova Solutions builds next-generation distributed systems "
                    "and enterprise AI integration platforms for Fortune 500 "
                    "organizations."
                ),
                "is_verified": True,
            },
            {
                "name": "CloudScale Labs",
                "industry": "DevOps & Cloud Infrastructure",
                "website": "https://cloudscale.dev",
                "logo_url": (
                    "https://images.unsplash.com/photo-1551434678-e076c223a692"
                    "?w=128&h=128&fit=crop"
                ),
                "description": (
                    "CloudScale Labs provides high-availability Kubernetes "
                    "orchestration, observability pipelines, and cloud migration "
                    "frameworks."
                ),
                "is_verified": True,
            },
            {
                "name": "Apex Health",
                "industry": "HealthTech & Biotechnology",
                "website": "https://apexhealth.ai",
                "logo_url": (
                    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d"
                    "?w=128&h=128&fit=crop"
                ),
                "description": (
                    "Apex Health develops HIPAA-compliant AI diagnostics and "
                    "telemetry synchronization tools for modern hospital networks."
                ),
                "is_verified": True,
            },
            {
                "name": "Starlight Cyber",
                "industry": "Cybersecurity & Zero Trust",
                "website": "https://starlightcyber.com",
                "logo_url": (
                    "https://images.unsplash.com/photo-1563986768609-322da13575f3"
                    "?w=128&h=128&fit=crop"
                ),
                "description": (
                    "Autonomous identity verification and threat detection platform "
                    "for modern cloud-native enterprises."
                ),
                "is_verified": True,
            },
        ]

        companies = {}
        for cdata in companies_data:
            company, created = Company.objects.update_or_create(
                name=cdata["name"],
                defaults=cdata,
            )
            companies[company.name] = company
            action = "Created" if created else "Updated"
            self.stdout.write(f"  [{action}] Company: {company.name}")

        # -------------------------------------------------------------
        # 2. SEED ACCOUNTS (ADMIN, RECRUITER, CANDIDATES)
        # -------------------------------------------------------------
        default_password = "Password123!"

        # A. Admin Account
        admin_user, created = User.objects.get_or_create(
            email="admin@smartats.com",
            defaults={
                "role": User.Role.ADMIN,
                "first_name": "System",
                "last_name": "Admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin_user.set_password(default_password)
        admin_user.role = User.Role.ADMIN
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        self.stdout.write(f"  [Configured] Admin: {admin_user.email}")

        # B. Recruiter Account (TechNova Solutions)
        technova = companies["TechNova Solutions"]
        recruiter_user, created = User.objects.get_or_create(
            email="recruiter@technova.com",
            defaults={
                "role": User.Role.RECRUITER,
                "first_name": "Jordan",
                "last_name": "Davis",
            },
        )
        recruiter_user.set_password(default_password)
        recruiter_user.role = User.Role.RECRUITER
        recruiter_user.first_name = "Jordan"
        recruiter_user.last_name = "Davis"
        recruiter_user.save()

        RecruiterProfile.objects.update_or_create(
            user=recruiter_user,
            defaults={
                "company": technova,
                "company_name": technova.name,
                "title": "Director of Talent Acquisition",
                "department": "Engineering Recruitment",
            },
        )
        self.stdout.write(
            f"  [Configured] Recruiter: {recruiter_user.email} -> {technova.name}"
        )

        # C. Primary Candidate Account
        primary_candidate, created = User.objects.get_or_create(
            email="candidate@test.com",
            defaults={
                "role": User.Role.CANDIDATE,
                "first_name": "Alex",
                "last_name": "Chen",
            },
        )
        primary_candidate.set_password(default_password)
        primary_candidate.role = User.Role.CANDIDATE
        primary_candidate.first_name = "Alex"
        primary_candidate.last_name = "Chen"
        primary_candidate.save()

        CandidateProfile.objects.update_or_create(
            user=primary_candidate,
            defaults={
                "first_name": "Alex",
                "last_name": "Chen",
                "headline": "Senior Full-Stack Engineer (Python / React / TypeScript)",
                "bio": (
                    "Senior software engineer with 6+ years building resilient "
                    "microservices and reactive React interfaces."
                ),
                "location": "San Francisco, CA",
                "linkedin_url": "https://linkedin.com/in/alexchen-dev",
                "github_url": "https://github.com/alexchen-dev",
            },
        )
        self.stdout.write(
            f"  [Configured] Primary Candidate: {primary_candidate.email}"
        )

        # D. Additional Candidates for rich pipeline data
        additional_candidates_data = [
            {
                "email": "sarah.jenkins@gmail.com",
                "first_name": "Sarah",
                "last_name": "Jenkins",
                "headline": "AI & Applied Machine Learning Researcher",
                "location": "Boston, MA",
            },
            {
                "email": "marcus.vance@outlook.com",
                "first_name": "Marcus",
                "last_name": "Vance",
                "headline": "Lead Backend & Distributed Systems Architect",
                "location": "Seattle, WA",
            },
            {
                "email": "elena.rostova@techmail.io",
                "first_name": "Elena",
                "last_name": "Rostova",
                "headline": "Senior Frontend Platform & Performance Engineer",
                "location": "New York, NY",
            },
        ]

        candidate_users = {"candidate@test.com": primary_candidate}
        for cand in additional_candidates_data:
            u, _ = User.objects.get_or_create(
                email=cand["email"],
                defaults={
                    "role": User.Role.CANDIDATE,
                    "first_name": cand["first_name"],
                    "last_name": cand["last_name"],
                },
            )
            u.set_password(default_password)
            u.role = User.Role.CANDIDATE
            u.save()

            CandidateProfile.objects.update_or_create(
                user=u,
                defaults={
                    "first_name": cand["first_name"],
                    "last_name": cand["last_name"],
                    "headline": cand["headline"],
                    "location": cand["location"],
                },
            )
            candidate_users[u.email] = u
            self.stdout.write(f"  [Configured] Candidate: {u.email}")

        # -------------------------------------------------------------
        # 3. SEED JOB REQUISITIONS & SKILLS
        # -------------------------------------------------------------
        jobs_data = [
            {
                "title": "Senior Full-Stack Engineer",
                "company": companies["TechNova Solutions"],
                "department": "Core Platform",
                "location": "Remote / San Francisco, CA",
                "job_type": Job.JobType.FULL_TIME,
                "salary_min": decimal.Decimal("140000.00"),
                "salary_max": decimal.Decimal("185000.00"),
                "description": (
                    "We are seeking a Senior Full-Stack Engineer to architect "
                    "distributed web applications and high-throughput APIs. You will "
                    "collaborate with product designers and infrastructure engineers "
                    "to build resilient, accessible, and performant user experiences."
                ),
                "skills": [
                    ("Python", True),
                    ("Django", True),
                    ("React", True),
                    ("TypeScript", True),
                    ("PostgreSQL", True),
                    ("Redis", False),
                    ("Docker", False),
                ],
            },
            {
                "title": "AI/ML Engineer",
                "company": companies["Apex Health"],
                "department": "Applied AI",
                "location": "Remote / Boston, MA",
                "job_type": Job.JobType.FULL_TIME,
                "salary_min": decimal.Decimal("160000.00"),
                "salary_max": decimal.Decimal("210000.00"),
                "description": (
                    "Join our healthcare AI team to build transformer-based "
                    "clinical document processing and semantic search systems. "
                    "You will train, evaluate, and deploy deep learning models "
                    "on large multi-modal biomedical datasets."
                ),
                "skills": [
                    ("Python", True),
                    ("PyTorch", True),
                    ("NLP", True),
                    ("FastAPI", True),
                    ("Transformers", True),
                    ("pgvector", False),
                    ("Docker", False),
                ],
            },
            {
                "title": "Data Infrastructure Lead",
                "company": companies["CloudScale Labs"],
                "department": "Infrastructure",
                "location": "Remote / Seattle, WA",
                "job_type": Job.JobType.FULL_TIME,
                "salary_min": decimal.Decimal("155000.00"),
                "salary_max": decimal.Decimal("195000.00"),
                "description": (
                    "Lead our core platform data engineering team responsible for "
                    "petabyte-scale event pipelines, Kafka streaming architectures, "
                    "and ClickHouse OLAP stores."
                ),
                "skills": [
                    ("Python", True),
                    ("Apache Kafka", True),
                    ("Kubernetes", True),
                    ("PostgreSQL", True),
                    ("Go", False),
                    ("Terraform", False),
                ],
            },
            {
                "title": "Senior Frontend Architect",
                "company": companies["TechNova Solutions"],
                "department": "Frontend Core",
                "location": "Remote / New York, NY",
                "job_type": Job.JobType.FULL_TIME,
                "salary_min": decimal.Decimal("145000.00"),
                "salary_max": decimal.Decimal("190000.00"),
                "description": (
                    "Design and lead the evolution of our enterprise design systems "
                    "and component libraries using React 18, Vite, and Tailwind CSS. "
                    "Elevate user experience, frontend testing, and client-side "
                    "performance."
                ),
                "skills": [
                    ("React", True),
                    ("TypeScript", True),
                    ("Tailwind CSS", True),
                    ("Web Performance", True),
                    ("Next.js", False),
                    ("Jest", False),
                ],
            },
        ]

        seeded_jobs = {}
        for jdata in jobs_data:
            skills = jdata.pop("skills")
            job, created = Job.objects.update_or_create(
                company=jdata["company"],
                title=jdata["title"],
                defaults={
                    "recruiter": recruiter_user,
                    "department": jdata["department"],
                    "location": jdata["location"],
                    "job_type": jdata["job_type"],
                    "salary_min": jdata["salary_min"],
                    "salary_max": jdata["salary_max"],
                    "description": jdata["description"],
                    "is_active": True,
                },
            )
            seeded_jobs[job.title] = job

            # Attach skills
            for sname, sreq in skills:
                JobSkill.objects.update_or_create(
                    job=job,
                    skill_name=sname,
                    defaults={"is_required": sreq},
                )

            action = "Created" if created else "Updated"
            self.stdout.write(f"  [{action}] Job: {job.title} ({job.company.name})")

        # -------------------------------------------------------------
        # 4. SEED CANDIDATE APPLICATIONS & AI MATCH SCORES
        # -------------------------------------------------------------
        applications_data = [
            # App 1: Alex Chen -> Senior Full-Stack Engineer (92% match)
            {
                "candidate": candidate_users["candidate@test.com"],
                "job": seeded_jobs["Senior Full-Stack Engineer"],
                "resume_filename": "Alex_Chen_FullStack_Resume.pdf",
                "status": Application.Status.SHORTLISTED,
                "cover_letter": (
                    "I have spent the last 6 years building high-concurrency Django "
                    "services and React interfaces. TechNova's engineering culture "
                    "and AI vision align directly with my technical capabilities."
                ),
                "match_score": {
                    "overall_score": decimal.Decimal("92.00"),
                    "semantic_score": decimal.Decimal("94.50"),
                    "skill_overlap_score": decimal.Decimal("90.00"),
                    "matched_skills": [
                        "Python",
                        "Django",
                        "React",
                        "TypeScript",
                        "PostgreSQL",
                    ],
                    "missing_skills": ["Redis"],
                },
            },
            # App 2: Marcus Vance -> Senior Full-Stack Engineer (78% match)
            {
                "candidate": candidate_users["marcus.vance@outlook.com"],
                "job": seeded_jobs["Senior Full-Stack Engineer"],
                "resume_filename": "Marcus_Vance_Backend_Architect.pdf",
                "status": Application.Status.INTERVIEW_SCHEDULED,
                "cover_letter": (
                    "Extensive experience in distributed Python services and "
                    "enterprise database architectures. Looking forward to "
                    "discussing how I can strengthen TechNova's platform layer."
                ),
                "match_score": {
                    "overall_score": decimal.Decimal("78.00"),
                    "semantic_score": decimal.Decimal("82.00"),
                    "skill_overlap_score": decimal.Decimal("74.00"),
                    "matched_skills": ["Python", "PostgreSQL", "Docker"],
                    "missing_skills": ["TypeScript", "React"],
                },
            },
            # App 3: Sarah Jenkins -> AI/ML Engineer (95% match)
            {
                "candidate": candidate_users["sarah.jenkins@gmail.com"],
                "job": seeded_jobs["AI/ML Engineer"],
                "resume_filename": "Sarah_Jenkins_ML_Engineer.pdf",
                "status": Application.Status.OFFERED,
                "cover_letter": (
                    "Published author on transformer-based biomedical entity "
                    "extraction. Excited to help Apex Health scale its automated "
                    "diagnostic pipelines."
                ),
                "match_score": {
                    "overall_score": decimal.Decimal("95.00"),
                    "semantic_score": decimal.Decimal("97.00"),
                    "skill_overlap_score": decimal.Decimal("93.00"),
                    "matched_skills": [
                        "Python",
                        "PyTorch",
                        "NLP",
                        "FastAPI",
                        "Transformers",
                        "pgvector",
                    ],
                    "missing_skills": [],
                },
            },
            # App 4: Elena Rostova -> Senior Frontend Architect (88% match)
            {
                "candidate": candidate_users["elena.rostova@techmail.io"],
                "job": seeded_jobs["Senior Frontend Architect"],
                "resume_filename": "Elena_Rostova_Design_Systems.pdf",
                "status": Application.Status.SCREENING,
                "cover_letter": (
                    "Specialized in design systems and web application performance "
                    "at scale. Excited to lead TechNova's next generation UI "
                    "architecture."
                ),
                "match_score": {
                    "overall_score": decimal.Decimal("88.00"),
                    "semantic_score": decimal.Decimal("91.00"),
                    "skill_overlap_score": decimal.Decimal("85.00"),
                    "matched_skills": [
                        "React",
                        "TypeScript",
                        "Tailwind CSS",
                        "Web Performance",
                    ],
                    "missing_skills": ["Jest"],
                },
            },
            # App 5: Alex Chen -> AI/ML Engineer (45% match)
            {
                "candidate": candidate_users["candidate@test.com"],
                "job": seeded_jobs["AI/ML Engineer"],
                "resume_filename": "Alex_Chen_General.pdf",
                "status": Application.Status.APPLIED,
                "cover_letter": (
                    "Experienced full-stack developer eager to transition into "
                    "applied ML production systems."
                ),
                "match_score": {
                    "overall_score": decimal.Decimal("45.00"),
                    "semantic_score": decimal.Decimal("52.00"),
                    "skill_overlap_score": decimal.Decimal("38.00"),
                    "matched_skills": ["Python", "FastAPI"],
                    "missing_skills": ["PyTorch", "NLP", "Transformers", "pgvector"],
                },
            },
        ]

        for app_data in applications_data:
            candidate = app_data["candidate"]
            job = app_data["job"]

            # Mock resume document
            mock_text = (
                f"%PDF-1.4 Mock resume file for {candidate.email} targeting {job.title}"
            )
            mock_content = mock_text.encode("utf-8")
            resume, _ = Resume.objects.get_or_create(
                candidate=candidate,
                original_filename=app_data["resume_filename"],
                defaults={
                    "file": ContentFile(mock_content, name=app_data["resume_filename"]),
                    "file_size": len(mock_content),
                    "mime_type": "application/pdf",
                },
            )

            # Application
            app, created = Application.objects.update_or_create(
                job=job,
                candidate=candidate,
                defaults={
                    "resume": resume,
                    "status": app_data["status"],
                    "cover_letter": app_data["cover_letter"],
                },
            )

            # Match Score
            score_data = app_data["match_score"]
            MatchScore.objects.update_or_create(
                application=app,
                defaults=score_data,
            )

            action = "Created" if created else "Updated"
            self.stdout.write(
                f"  [{action}] Application: {candidate.email} -> {job.title} "
                f"[{app.status}] ({score_data['overall_score']}% match)"
            )

        self.stdout.write(
            self.style.SUCCESS("\nSmartATS database seeded successfully!")
        )
        self.stdout.write(self.style.SUCCESS("Demo credentials summary:"))
        self.stdout.write("  - Admin:     admin@smartats.com / Password123!")
        self.stdout.write("  - Recruiter: recruiter@technova.com / Password123!")
        self.stdout.write("  - Candidate: candidate@test.com / Password123!")
