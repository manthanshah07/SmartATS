# Work Breakdown Structure & Task Matrix (task.md) — SmartATS

## 1. Task Legend
* **P0 (Critical)**: Blockers required for core functionality.
* **P1 (High)**: Core features essential for full user journeys.
* **P2 (Medium)**: Enhancements, optimization, and advanced analytics.

---

## 2. Sprint Breakdown & Task Checklist

### Sprint 0: Repository Setup & Infrastructure Scaffolding (Days 1–5)
- [ ] **T0.1** (P0): Initialize Git repository with decoupled `/frontend`, `/backend`, and `/docs` directories.
- [ ] **T0.2** (P0): Setup `docker-compose.yml` defining `backend`, `frontend`, `postgres` (with `pgvector`), `redis`, and `celery_worker`.
- [ ] **T0.3** (P0): Configure linting and pre-commit hooks (`black`, `flake8`, `isort`, `eslint`, `prettier`).
- [ ] **T0.4** (P1): Setup GitHub Actions CI workflow for automated linting and test execution.

---

### Sprint 1: Identity, Authentication & Role-Based Access Control (Days 6–10)
- [ ] **T1.1** (P0): Implement custom `User` model with `role` choices (`CANDIDATE`, `RECRUITER`, `ADMIN`).
- [ ] **T1.2** (P0): Implement `CandidateProfile` and `RecruiterProfile` one-to-one models.
- [ ] **T1.3** (P0): Configure `djangorestframework-simplejwt` with custom claims (`role`, `email`).
- [ ] **T1.4** (P0): Implement JWT refresh token blacklisting on logout endpoint.
- [ ] **T1.5** (P0): Create custom DRF permission classes (`IsCandidate`, `IsRecruiter`, `IsAdminUser`, `IsOwnerOrReadOnly`).
- [ ] **T1.6** (P1): Write comprehensive auth unit and integration tests.

---

### Sprint 2: Company Verification & Job Requisition System (Days 11–16)
- [ ] **T2.1** (P0): Build `Company` model with verification flag and recruiter association.
- [ ] **T2.2** (P0): Build `Job` and `JobSkill` models with salary ranges, locations, and requirement tiers.
- [ ] **T2.3** (P0): Implement Job CRUD REST API endpoints with recruiter-only write permissions.
- [ ] **T2.4** (P1): Implement public job search and multi-facet filtering (location, department, salary, type).
- [ ] **T2.5** (P1): Seed realistic mock companies and job postings for development testing.

---

### Sprint 3: Application Lifecycle & State Machine (Days 17–22)
- [ ] **T3.1** (P0): Build `Application` model with state machine states (`APPLIED`, `SCREENING`, `SHORTLISTED`, `INTERVIEW_SCHEDULED`, `OFFERED`, `REJECTED`, `WITHDRAWN`).
- [ ] **T3.2** (P0): Implement `ApplicationStatusHistory` audit model.
- [ ] **T3.3** (P0): Build state transition validation service to block illegal stage leaps.
- [ ] **T3.4** (P0): Create Application submission endpoint with file upload handling (PDF/DOCX validation).
- [ ] **T3.5** (P1): Build recruiter candidate list API with sorting and stage filtering.

---

### Sprint 4: AI Matching Engine & Asynchronous Worker Pipeline (Days 23–30)
- [ ] **T4.1** (P0): Configure Celery worker and Redis broker in Django.
- [ ] **T4.2** (P0): Implement PDF/DOCX text extraction service using `pdfplumber` / `PyMuPDF`.
- [ ] **T4.3** (P0): Build skill and entity extraction pipeline using `spaCy` (`en_core_web_sm`).
- [ ] **T4.4** (P0): Integrate `SentenceTransformer` (`all-MiniLM-L6-v2`) to generate 384-dimensional embeddings.
- [ ] **T4.5** (P0): Setup `pgvector` column and HNSW index in PostgreSQL.
- [ ] **T4.6** (P0): Build asynchronous Celery task `process_resume_and_match(application_id)`.
- [ ] **T4.7** (P1): Compute hybrid match score (cosine similarity + skill overlap ratio) and save `MatchScore` record.
- [ ] **T4.8** (P1): Expose explainable match breakdown API endpoint.

---

### Sprint 5: Frontend Client Application (Days 31–40)
- [ ] **T5.1** (P0): Initialize React 18 + Vite + TypeScript application with Tailwind CSS and `shadcn/ui`.
- [ ] **T5.2** (P0): Build Axios API client with automatic token refreshing interceptors.
- [ ] **T5.3** (P0): Implement React Router with public, protected, and role-guarded routes.
- [ ] **T5.4** (P1): Build Candidate Portal:
  - Job discovery and search view.
  - Application submission modal with drag-and-drop resume upload.
  - "My Applications" dashboard with status tracking.
- [ ] **T5.5** (P1): Build Recruiter Portal:
  - Job creation and requisition manager.
  - Interactive candidate Kanban board.
  - Candidate detail modal with AI Match Score, skill overlap chips, and missing skill warnings.

---

### Sprint 6: Interview Coordination, In-App Notifications & Analytics (Days 41–46)
- [ ] **T6.1** (P1): Implement `Interview` model and scheduling API.
- [ ] **T6.2** (P1): Implement `.ics` calendar invitation generator for scheduled rounds.
- [ ] **T6.3** (P1): Build in-app `Notification` system for application updates and interview invites.
- [ ] **T6.4** (P2): Build Recruiter Analytics Dashboard (charts for time-to-hire, applicant volume, funnel drop-off).

---

### Sprint 7: Testing, Auditing & Cloud Deployment (Days 47–50)
- [ ] **T7.1** (P0): Run full security audit per `audit.md` (OWASP checks, CORS, rate limits, PII masking).
- [ ] **T7.2** (P0): Optimize database queries with `select_related` and `prefetch_related`.
- [ ] **T7.3** (P0): Deploy Postgres with `pgvector` on Neon (free tier).
- [ ] **T7.4** (P0): Deploy Redis on Upstash (free tier).
- [ ] **T7.5** (P0): Deploy Django API and Celery worker on Render / Fly.io.
- [ ] **T7.6** (P0): Deploy React SPA on Vercel with edge caching.
- [ ] **T7.7** (P0): Execute end-to-end smoke tests on live production URLs.
