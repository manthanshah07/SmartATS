# Implementation Plan — SmartATS

## 1. Overview & Strategy
This document outlines the step-by-step phased engineering roadmap for building **SmartATS** from scratch. The strategy emphasizes building a solid foundation first (RBAC, domain models, and state machines), followed by an asynchronous AI processing pipeline, modern React frontend interface, and automated deployment.

---

## 2. Phase-by-Phase Roadmap

```
Phase 0: Architecture & Bootstrap
   │
   ▼
Phase 1: Auth & User Identity (RBAC + JWT)
   │
   ▼
Phase 2: Core Domain Logic & State Machine (Jobs, Companies, Applications)
   │
   ▼
Phase 3: AI Engine & Async Workers (Celery + Redis + Sentence Transformers)
   │
   ▼
Phase 4: Frontend Development (React 18 + Vite + shadcn/ui + TanStack Query)
   │
   ▼
Phase 5: Interview Coordination, Notifications & Analytics
   │
   ▼
Phase 6: Testing, Security Hardening & Pre-Flight Audits
   │
   ▼
Phase 7: Cloud Deployment ($0 Free Tier Blueprint & CI/CD)
```

---

### Phase 0: Project Bootstrap & Environment Setup (Week 1)
* **Objective**: Establish repo structure, developer tooling, Docker Compose environments, and linting standards.
* **Tasks**:
  1. Initialize monorepo or decoupled subdirectories (`frontend/`, `backend/`, `docs/`, `infra/`).
  2. Setup `backend/` with Python 3.12, virtual environment, and initial dependencies (`django`, `djangorestframework`, `celery`, `redis`, `psycopg2-binary`).
  3. Setup `frontend/` with Vite, React 18, TypeScript, Tailwind CSS, and `shadcn/ui`.
  4. Write `docker-compose.yml` defining `backend`, `db` (Postgres 16 + `pgvector`), `redis`, and `celery_worker` services.
  5. Configure pre-commit hooks (`black`, `flake8`, `isort`, `eslint`, `prettier`).

---

### Phase 1: Authentication, RBAC & User Identity (Week 2)
* **Objective**: Build rock-solid authentication with role-based access control.
* **Tasks**:
  1. Define custom `User` model inheriting from `AbstractUser` with role choices: `CANDIDATE`, `RECRUITER`, `ADMIN`.
  2. Create associated profile models: `CandidateProfile` and `RecruiterProfile`.
  3. Configure `djangorestframework-simplejwt` with custom token claims (`role`, `user_id`, `email`).
  4. Implement token refresh endpoint with server-side token blacklisting (`rest_framework_simplejwt.token_blacklist`).
  5. Implement custom DRF permissions: `IsCandidate`, `IsRecruiter`, `IsAdminUser`, `IsOwnerOrReadOnly`.
  6. Write integration tests for registration, login, logout, and unauthorized access attempts.

---

### Phase 2: Domain Models & Application State Machine (Week 3)
* **Objective**: Implement company management, job listings, and application tracking with strict state transitions.
* **Tasks**:
  1. Implement `Company` model with verification status flag and recruiter association.
  2. Build `Job` and `JobSkill` models with support for salary ranges, experience level, remote flags, and full-text search indexing.
  3. Build `Application` model with state machine states:
     * `APPLIED`, `SCREENING`, `SHORTLISTED`, `INTERVIEW_SCHEDULED`, `OFFERED`, `REJECTED`, `WITHDRAWN`.
  4. Implement `ApplicationStatusHistory` model to audit every transition with timestamps and author ID.
  5. Write validation logic preventing invalid state transitions (e.g., throwing a `ValidationError` if transitioning from `APPLIED` straight to `OFFERED`).
  6. Build CRUD API endpoints with pagination and filtering for candidates and recruiters.

---

### Phase 3: AI Matching Engine & Asynchronous Worker Pipeline (Weeks 4-5)
* **Objective**: Build local NLP parsing, vector embedding generation, and explainable scoring without external API costs.
* **Tasks**:
  1. Configure Celery with Redis broker and result backend.
  2. Implement file upload handler for PDF/DOCX resumes (with MIME type validation and size limits).
  3. Build text extraction service using `pdfplumber` / `PyMuPDF`.
  4. Build entity extraction pipeline using `spaCy` (`en_core_web_sm`) to parse skills, experience, and education.
  5. Integrate `sentence-transformers/all-MiniLM-L6-v2` to generate 384-dimensional dense vectors.
  6. Enable `pgvector` extension in PostgreSQL and define `vector(384)` column on `ResumeEmbedding` and `JobEmbedding` tables.
  7. Implement Celery task `process_resume_and_match(application_id)`:
     * Extracts text -> Runs NER -> Generates embeddings -> Calculates Cosine Similarity -> Computes Skill Gaps -> Saves `MatchScore` record.
  8. Expose match score and explainability breakdown endpoints for recruiter dashboards.

---

### Phase 4: Frontend Development (Weeks 6-7)
* **Objective**: Build a responsive, accessible React SPA client.
* **Tasks**:
  1. Setup routing via `react-router-dom` with public, protected, and role-guarded routes.
  2. Build shared state management and API client using Axios interceptors (auto-refreshing expired access tokens).
  3. Implement TanStack Query for server state caching, pagination, and optimistic mutations.
  4. Candidate Views:
     * Job discovery & search page with multi-facet filters.
     * Resume upload & profile builder.
     * "My Applications" dashboard displaying current stage and match insights.
  5. Recruiter Views:
     * Job creation & editor form (using `react-hook-form` + `zod`).
     * Candidate Kanban board / pipeline table.
     * Candidate detail modal featuring interactive AI Match Breakdown (radar charts/badges for matched vs. missing skills).

---

### Phase 5: Interview Scheduling, In-App Notifications & Analytics (Week 8)
* **Objective**: Streamline communication and recruitment metrics.
* **Tasks**:
  1. Build `Interview` scheduling model and API (round type, date, duration, meeting link, candidate notification).
  2. Implement `.ics` calendar invitation generator.
  3. Create event-driven `Notification` system triggering on application status updates and interview bookings.
  4. Build Recruiter Analytics Dashboard (charts for applicant volume, time-to-hire, funnel conversion, and top missing skills).

---

### Phase 6: Automated Testing & Security Hardening (Week 9)
* **Objective**: Guarantee stability, security compliance, and performance before release.
* **Tasks**:
  1. Backend unit and API tests with `pytest` / `pytest-django` (target >85% code coverage).
  2. Frontend component tests with Vitest and React Testing Library.
  3. End-to-end tests with Playwright covering critical flows (Register -> Post Job -> Apply -> Parse -> Review).
  4. Run security audit: check for OWASP Top 10 vulnerabilities, verify CORS origins, sanitize HTML inputs.
  5. Perform database query optimization (`select_related`, `prefetch_related`) to prevent N+1 queries.

---

### Phase 7: Deployment & CI/CD Pipeline (Week 10)
* **Objective**: Deploy live application on $0 free-tier cloud infrastructure.
* **Tasks**:
  1. Setup GitHub Actions workflow for linting, testing, and automated Docker build checks.
  2. Deploy PostgreSQL database on **Neon** and run `CREATE EXTENSION IF NOT EXISTS vector;`.
  3. Deploy Redis message broker on **Upstash**.
  4. Deploy Django API & Celery worker on **Render** / **Fly.io**.
  5. Deploy React SPA on **Vercel** with CDN caching.
  6. Run smoke tests on production endpoints and verify live file upload and async parsing.
