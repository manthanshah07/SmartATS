# SmartATS — Enterprise AI-Powered Applicant Tracking System

[![Build & Test Status](https://img.shields.io/badge/CI-Passing-emerald?style=flat-square&logo=github-actions)](https://github.com/manthanshah07/SmartATS/actions)
[![Automated Test Suite](https://img.shields.io/badge/Tests-81%2F81%20Passed-blue?style=flat-square&logo=checkmarx)](https://github.com/manthanshah07/SmartATS)
[![Python Version](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Django Framework](https://img.shields.io/badge/Django-5.1-092E20?style=flat-square&logo=django&logoColor=white)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://render.com)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg?style=flat-square)](LICENSE)

---

## 1. Executive Summary & Problem Statement

Modern enterprise talent acquisition is bottlenecked by fragmented workflows, opaque resume parsing, and high-latency candidate evaluation. Traditional ATS platforms rely on rigid keyword-matching heuristics that discard high-potential candidates over trivial vocabulary differences while offering zero explainability into match scoring. Furthermore, recruiters waste countless hours managing disjointed status updates across manual spreadsheets and insecure email threads.

**SmartATS** is an enterprise-grade, distributed Applicant Tracking System engineered for high concurrency, security, and transparent candidate evaluation. Built on **Django 5.1 REST Framework** and **React 18 + TypeScript**, SmartATS combines:
- **Hybrid Semantic Candidate Matching:** Evaluates candidates using both 384-dimensional dense semantic vector similarity (`all-MiniLM-L6-v2`) and deterministic skill-graph overlap.
- **Explainable AI Insights:** Breaks match scores into objective semantic relevance, verified skills, and missing technical competencies.
- **Deterministic Application State Machine:** Governs candidate lifecycles with strict database row-level locking (`select_for_update`) to prevent race conditions during high-volume stage transitions.
- **Multi-Tenant Security Architecture:** Hardened with role-based JWT authentication, anti-IDOR tenant validation, binary magic-byte inspection, and strict rate-limiting.
- **Low-Footprint Distributed Architecture:** Memory-profiled to operate within constrained cloud environments (such as Render 512MB RAM tiers) via lazy PyTorch instantiation and deterministic feature-hashing fallbacks.

---

## 2. System Architecture & Distributed Data Flow

SmartATS employs a decoupled micro-service cloud architecture designed for zero single-points-of-failure, horizontal scalability, and rapid global content delivery.

### Cloud Topology & Component Interaction

```mermaid
flowchart TD
    subgraph ClientLayer["Edge & Client Tier"]
        SPA["Vercel Edge Network\nReact 18 + TypeScript SPA\n(Tailwind CSS, TanStack Query)"]
    end

    subgraph IngressGateway["API & Application Gateway"]
        CDN["Render Ingress / Cloudflare\nSSL/TLS Termination"]
        Gunicorn["Gunicorn WSGI Server\n(1 Worker, 2 Threads)"]
        DjangoApp["Django 5.1 REST API\n(JWT Auth, Rate Limiter, Throttling)"]
    end

    subgraph WorkerTier["Asynchronous Processing Tier"]
        RedisBroker["Redis 7 (In-Memory Broker)\nCelery Task Queue & Pub/Sub"]
        CeleryWorker["Celery Background Worker\n(Concurrency=1, Max 120MB RAM)"]
    end

    subgraph DataStorageTier["Persistence & Object Storage"]
        Postgres["Neon / Supabase PostgreSQL 16\n(pgvector Extension, ACID Storage)"]
        S3Storage["AWS S3 / Cloudinary\n(Signed Expiring URLs, Private ACL)"]
    end

    SPA -->|HTTPS / REST API + JWT| CDN
    CDN --> Gunicorn
    Gunicorn --> DjangoApp
    DjangoApp -->|Connection Pool 600s| Postgres
    DjangoApp -->|Task Enqueue| RedisBroker
    DjangoApp -->|Direct Upload / Presigned GET| S3Storage
    RedisBroker -->|Consume Tasks| CeleryWorker
    CeleryWorker -->|Read Resume Files| S3Storage
    CeleryWorker -->|Update Parsed Data & Scores| Postgres
```

### ASCII Architecture Overview

```text
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|  [ Candidate Portal: /candidate/jobs ]       [ Recruiter Pipeline: /recruiter/pipeline ] |
+-------------------------------------------+-------------------------------------------+
                                            |
                         HTTPS / REST / JWT | Bearer Token
                                            v
+---------------------------------------------------------------------------------------+
|                         RENDER WEB SERVICE (Django 5.1 API)                           |
|  - Middleware: CORS, Security, WhiteNoise Static, Throttling (1000/day user)           |
|  - Auth: SimpleJWT (15-min Access Token, 7-day Rotating Refresh Token)                |
|  - Controllers: Accounts, Jobs, Applications, Interviews, Notifications, Analytics    |
+---------------------+-------------------------------+---------------------------------+
                      |                               |
     SQL / pgvector   |               Celery Tasks    | Redis Pub/Sub
                      v                               v
+-----------------------------+     +---------------------------------------------------+
|   NEON / SUPABASE POSTGRES  |     |               REDIS BROKER (Redis 7)              |
|  - Users & Profiles         |     +-------------------------+-------------------------+
|  - Companies & Job Posts    |                               |
|  - Applications & History   |                               v
|  - 384-Dim Dense Embeddings |     +---------------------------------------------------+
|  - Row Locking (ACID)       |     |         CELERY WORKER (smartats-celery)           |
+-----------------------------+     |  - PyMuPDF / pdfplumber Text Extraction           |
                                    |  - 384-Dim Semantic Dense Vector Generation       |
                                    |  - Hybrid Cosine + Skill Overlap Engine           |
                                    |  - Memory-capped: max 120MB per child worker      |
                                    +---------------------------------------------------+
```

---

## 3. Application State Machine & Lifecycle

Candidate applications progress through a deterministic, auditable finite-state machine implemented in `backend/applications/services.py` (`ApplicationStateMachine`). Every transition enforces strict transition graph rules and creates an immutable audit trail in `ApplicationStatusHistory`.

```mermaid
stateDiagram-v2
    [*] --> APPLIED : Candidate Submits Application & Resume

    APPLIED --> SCREENING : Recruiter Reviews Resume / AI Match Score
    APPLIED --> REJECTED : Does Not Meet Minimum Qualifications
    APPLIED --> WITHDRAWN : Candidate Self-Withdrawal

    SCREENING --> SHORTLISTED : Technical Match Confirmed
    SCREENING --> REJECTED : Profile Declined
    SCREENING --> WITHDRAWN : Candidate Self-Withdrawal

    SHORTLISTED --> INTERVIEW_SCHEDULED : Interview Scheduled via Calendar Modal
    SHORTLISTED --> REJECTED : Candidate Unreachable / Mismatch
    SHORTLISTED --> WITHDRAWN : Candidate Self-Withdrawal

    INTERVIEW_SCHEDULED --> OFFERED : Candidate Cleared Interview Loop
    INTERVIEW_SCHEDULED --> REJECTED : Failed Technical or Culture Round
    INTERVIEW_SCHEDULED --> WITHDRAWN : Candidate Accepted Other Offer

    OFFERED --> HIRED : Offer Signed & Accepted
    OFFERED --> REJECTED : Offer Rescinded
    OFFERED --> WITHDRAWN : Candidate Declined Offer

    REJECTED --> [*]
    WITHDRAWN --> [*]
    HIRED --> [*]
```

### State Machine Transition Rules

| Initial State | Allowed Target States | Permitted Actors | Row Lock Applied |
| :--- | :--- | :--- | :---: |
| `APPLIED` | `SCREENING`, `REJECTED`, `WITHDRAWN` | Recruiter, Admin, Candidate (Withdraw only) | Yes (`select_for_update`) |
| `SCREENING` | `SHORTLISTED`, `REJECTED`, `WITHDRAWN` | Recruiter, Admin, Candidate (Withdraw only) | Yes (`select_for_update`) |
| `SHORTLISTED` | `INTERVIEW_SCHEDULED`, `REJECTED`, `WITHDRAWN` | Recruiter, Admin, Candidate (Withdraw only) | Yes (`select_for_update`) |
| `INTERVIEW_SCHEDULED` | `OFFERED`, `REJECTED`, `WITHDRAWN` | Recruiter, Admin, Candidate (Withdraw only) | Yes (`select_for_update`) |
| `OFFERED` | `HIRED`, `REJECTED`, `WITHDRAWN` | Recruiter, Admin, Candidate (Withdraw only) | Yes (`select_for_update`) |
| `REJECTED` | *(Terminal State — No transitions allowed)* | None | N/A |
| `WITHDRAWN` | *(Terminal State — No transitions allowed)* | None | N/A |
| `HIRED` | *(Terminal State — No transitions allowed)* | None | N/A |

---

## 4. Engineering Highlights & Hardened Security Controls

### P0 Security Controls & Threat Mitigations

SmartATS incorporates enterprise-grade defensive architecture addressing OWASP Top 10 vulnerabilities:

1. **Elimination of Vertical Privilege Escalation (`SEC-01` & `SEC-02`):**
   - In `backend/accounts/serializers.py`, `UserSerializer.Meta.read_only_fields` marks `role` as strictly immutable. Malicious users cannot elevate their role to `ADMIN` or `RECRUITER` via `PATCH /api/auth/me/`.
   - `RegisterSerializer.validate_role` enforces a closed enum: `[CANDIDATE, RECRUITER]`. Any payload containing `role="ADMIN"` is immediately rejected with an HTTP 400 `ValidationError`.
2. **Tenant Isolation & Anti-IDOR Protections (`SEC-04` & `SEC-05`):**
   - **Job Requisitions:** `JobSerializer.validate` verifies that the requesting recruiter belongs to the specified company. A recruiter from Company A cannot inject or modify requisitions for Company B.
   - **Interview Scheduling:** `InterviewSerializer.validate` validates that the target application belongs to the recruiter's tenant. Cross-tenant interview scheduling attempts are rejected with an explicit HTTP 400.
3. **Binary Magic-Byte Inspection (`SEC-03`):**
   - In `backend/applications/serializers.py` (`ResumeSerializer.validate_file`), file uploads undergo a 4-tier validation pipeline:
     1. File size check (max 5MB limit).
     2. Extension validation (`.pdf`, `.docx`).
     3. MIME type inspection.
     4. **Magic-byte binary inspection:** The raw file header is read to ensure true binary compliance (`b"%PDF-"` for PDF documents; `b"PK\x03\x04"` for Office Open XML / DOCX zip containers). Executables renamed to `.pdf` or polyglot files are rejected before touching disk or S3.

### Concurrency & Transactional Integrity

- **Row-Level Database Locking (`DB-FIX-01`):** High-volume ATS workflows can trigger race conditions when a recruiter advances a candidate while the candidate attempts to withdraw. SmartATS wraps all transitions in `@transaction.atomic` and executes `Application.objects.select_for_update().get(id=application.id)`, guaranteeing serialized ACID isolation.
- **Single-Pass ORM Aggregations (`PERF-FIX-01`):** The recruiter analytics dashboard (`RecruiterAnalyticsViewSet`) replaces iterative Python loops with single-pass database aggregations (`annotate(app_count=Count('applications'))`), reducing SQL roundtrips from $O(N)$ to $O(1)$.

### Memory-Constrained Optimization (512MB RAM Target)

Operating machine learning models inside 512MB RAM environments (e.g., Render free tier) presents severe OOM risks. SmartATS implements a robust 3-tier memory safety strategy:

```text
               Input Resume Text
                       |
        Is ENABLE_HEAVY_EMBEDDINGS True?
             /                  \
          [YES]                [NO]
           /                      \
  Lazy-load PyTorch          Deterministic 384-Dim
  & SentenceTransformer      Feature-Hashing Vectorizer
  (torch.set_num_threads(1)) (Unigrams + Bigrams, L2 Norm)
           |                      |
  Generate Embedding         Generate Embedding
  Peak RAM: ~380MB           Peak RAM: < 100KB
           |                      |
  del model; gc.collect()         gc.collect()
           \                      /
            v                    v
          Store vector & compute cosine similarity
```

1. **Lazy Loading of Heavy Dependencies:** PyTorch and `SentenceTransformer` are never imported at the module level. They are imported dynamically inside task execution only when `ENABLE_HEAVY_EMBEDDINGS=True`.
2. **Deterministic 384-Dimensional Feature Hashing Fallback:** Under memory constraints, SmartATS utilizes a deterministic n-gram hashing vectorizer. It computes sign-hashed unigrams and bigrams projected onto 384 dimensions with $L_2$ normalization. It consumes **under 100KB of RAM** while preserving semantic and lexical keyword overlap.
3. **Celery Worker Memory Guards:**
   ```python
   CELERY_WORKER_CONCURRENCY = 1
   CELERY_WORKER_MAX_TASKS_PER_CHILD = 50
   CELERY_WORKER_MAX_MEMORY_PER_CHILD = 120000  # 120MB threshold auto-restart
   ```

### Transparent AI Hybrid Matching Formula

Candidate suitability is calculated through a hybrid, explainable formula:

$$\text{Overall Score} = 0.65 \times \text{Semantic Score} + 0.35 \times \text{Skill Overlap Score}$$

Where:
- $\text{Semantic Score} = \max\left(0, \min\left(100, \frac{\cos(\vec{u}, \vec{v}) + 1}{2} \times 100\right)\right)$
- $\text{Skill Overlap Score} = \frac{|\text{Matched Skills}|}{|\text{Target Job Skills}|} \times 100$

---

## 5. API Specification & Core Endpoints

All primary API routes are versioned and documented under `/api/`. Unauthenticated requests to protected endpoints return `401 Unauthorized`.

| Method | Endpoint | Allowed Roles | Description | Request / Query Params |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Public | Register new Candidate or Recruiter account | `{ email, password, role, first_name, last_name, company_name }` |
| `POST` | `/api/auth/login/` | Public | Obtain JWT Access (15m) and Refresh (7d) tokens | `{ email, password }` |
| `POST` | `/api/auth/refresh/` | Public | Refresh expired access token | `{ refresh }` |
| `POST` | `/api/auth/logout/` | Authenticated | Blacklist active refresh token | `{ refresh }` |
| `GET` | `/api/auth/me/` | Authenticated | Retrieve current user profile and role | None |
| `GET` | `/api/jobs/` | Public | Browse published, active job postings | `?search=react&location=remote&job_type=FULL_TIME` |
| `POST` | `/api/jobs/` | Recruiter, Admin | Post new requisition under recruiter's verified tenant | `{ title, department, location, job_type, description, skills }` |
| `GET` | `/api/companies/` | Public | List verified hiring companies | `?industry=Enterprise Cloud` |
| `POST` | `/api/resumes/` | Candidate | Upload candidate resume with binary validation | `multipart/form-data: { file }` |
| `GET` | `/api/applications/` | Candidate, Recruiter | Filter applications (Candidates see own; Recruiters see tenant) | `?job_id={uuid}&status=SHORTLISTED` |
| `POST` | `/api/applications/` | Candidate | Apply for an active requisition | `{ job_id, resume_id, cover_letter }` |
| `POST` | `/api/applications/{id}/transition/` | Recruiter, Admin, Candidate | Execute validated state machine transition | `{ target_stage: "SHORTLISTED", notes: "Approved" }` |
| `GET` | `/api/applications/{id}/match_score/` | Recruiter, Candidate | Get explainable AI match breakdown | None |
| `GET` | `/api/interviews/` | Candidate, Recruiter | List interviews for tenant or candidate | `?application_id={uuid}` |
| `POST` | `/api/interviews/` | Recruiter, Admin | Schedule interview round and notify candidate | `{ application_id, round_name, scheduled_start, scheduled_end, meeting_url }` |
| `GET` | `/api/notifications/` | Authenticated | Fetch current user notifications | `?is_read=false` |
| `POST` | `/api/notifications/mark_all_read/` | Authenticated | Mark all user notifications as read | None |
| `GET` | `/api/analytics/recruiter/` | Recruiter, Admin | Single-pass requisition pipeline metrics | None |
| `GET` | `/healthz` | Public | Infrastructure health check (PostgreSQL & Redis) | None |

---

## 6. Local Development & Deployment Runbook

### Prerequisites

- **Python:** 3.12+
- **Node.js:** 20.x or 22.x LTS (npm 10+)
- **Database:** PostgreSQL 16+ (with `pgvector` extension)
- **Cache/Broker:** Redis 7+
- **Docker & Compose:** Optional for containerized workflow

---

### Environment Configuration Matrix

Create a `.env` file in the project root:

```ini
# ==============================================================================
# SMARTATS BACKEND CONFIGURATION
# ==============================================================================
DEBUG=True
SECRET_KEY=django-insecure-your-local-dev-secret-key-replace-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,.onrender.com

# Database Connection (Neon / Supabase / Local PostgreSQL)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/smartats_db

# Redis Connection (Celery Broker & Cache)
REDIS_URL=redis://localhost:6379/0

# Optional: Cloud Object Storage (Defaults to FileSystemStorage when False)
USE_S3=False
AWS_STORAGE_BUCKET_NAME=smartats-resumes
AWS_S3_REGION_NAME=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_QUERYSTRING_EXPIRE=3600

# CORS Allowed Origins
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://smart-ats-eta.vercel.app

# Machine Learning & Celery Configuration
ENABLE_HEAVY_EMBEDDINGS=False
CELERY_WORKER_CONCURRENCY=1

# ==============================================================================
# SMARTATS FRONTEND CONFIGURATION (frontend/.env)
# ==============================================================================
VITE_API_URL=http://localhost:8000/api
```

---

### Option A: Local Bare-Metal Setup

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python3.12 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Seed database with realistic companies, users, jobs, and applications
python manage.py seed_ats

# Run development server
python manage.py runserver 0.0.0.0:8000
```

#### 2. Start Celery Asynchronous Worker (in a separate terminal)

```bash
cd backend
source .venv/bin/activate
celery -A smartats worker --loglevel=info --concurrency=1
```

#### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite React development server
npm run dev
```

Visit `http://localhost:5173` to access the application.

---

### Option B: Docker Compose Setup

Run the entire distributed stack (PostgreSQL with `pgvector`, Redis 7, Django API, Celery Worker) with a single command:

```bash
cd infra
docker-compose up --build
```

---

### Pre-Seeded Test Credentials

Running `python manage.py seed_ats` populates the database with realistic organizations and test personas:

| Role | Email Address | Password | Organization / Tenant | Pre-Seeded Context |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@smartats.com` | `Password123!` | System-wide | Superuser privileges |
| **Recruiter** | `recruiter@technova.com` | `Password123!` | TechNova Solutions | Active requisitions & candidate pipeline |
| **Candidate** | `candidate@test.com` | `Password123!` | Public Candidate | Applied to Senior Full-Stack Engineer |
| **Candidate** | `sarah.chen@example.com` | `Password123!` | Public Candidate | AI Platform Engineer applicant (95% Match) |
| **Candidate** | `alex.rivera@example.com` | `Password123!` | Public Candidate | Cloud Architect applicant (88% Match) |

---

## 7. Verification & Quality Assurance Suite

SmartATS maintains a strict testing and linting bar across both backend and frontend layers:

```bash
# ---------------------------------------------------------
# 1. Backend Unit & Integration Tests (75 tests)
# ---------------------------------------------------------
cd backend
python manage.py test

# ---------------------------------------------------------
# 2. Backend Code Style & Static Analysis
# ---------------------------------------------------------
black --check .
flake8

# ---------------------------------------------------------
# 3. Frontend Automated Tests (Vitest + Testing Library)
# ---------------------------------------------------------
cd frontend
npm test

# ---------------------------------------------------------
# 4. Frontend Production TypeScript Compilation & Bundle Build
# ---------------------------------------------------------
npm run build
```

### Test Suite Coverage Breakdown

- **Total Automated Tests:** 81/81 Passing
  - **75 Backend Tests:** Model validations, JWT authentication flows, tenant isolation, anti-IDOR checks, magic-byte inspection, application state transitions with row locking, and analytics aggregations.
  - **6 Frontend Tests:** Role-based `AuthGuard` route security, redirection logic, unauthenticated prevention, notification counter badge states, and interactive bell dropdown behavior.

---

## 8. Deployment Architecture (Render & Vercel)

- **Backend Web Service (`smartats-api`):** Deployed on Render using the hardened non-root [backend/Dockerfile](file:///Users/manthanshah/Documents/SmartATS/backend/Dockerfile) with Gunicorn (`--workers 1 --threads 2`).
- **Asynchronous Worker (`smartats-celery`):** Deployed on Render via [render.yaml](file:///Users/manthanshah/Documents/SmartATS/render.yaml) connected to Render Redis.
- **Frontend SPA (`smart-ats`):** Deployed on Vercel with automatic edge code-splitting, route chunking, and push-state SPA rewrites.

---

## 9. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
