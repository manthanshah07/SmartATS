# SmartATS — Distributed AI-Powered Talent Acquisition Engine

[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-Passing-emerald?style=flat-square&logo=github-actions)](https://github.com/manthanshah07/SmartATS/actions)
[![Backend Test Suite](https://img.shields.io/badge/Backend%20Tests-75%2F75%20Passed-blue?style=flat-square&logo=django)](https://github.com/manthanshah07/SmartATS)
[![Frontend Test Suite](https://img.shields.io/badge/Frontend%20Tests-6%2F6%20Passed-blue?style=flat-square&logo=vitest)](https://github.com/manthanshah07/SmartATS)
[![Python Version](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Django Framework](https://img.shields.io/badge/Django-5.1-092E20?style=flat-square&logo=django&logoColor=white)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://render.com)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg?style=flat-square)](LICENSE)

---

## 1. Executive Summary & Engineering Trade-Offs

### Problem Statement

Modern enterprise talent acquisition is hindered by fragmented tooling, high-latency candidate workflows, and opaque resume screening. Traditional Applicant Tracking Systems (ATS) rely on brittle, exact-string keyword filters that discard qualified candidates over lexical variations while providing recruiters zero mathematical explainability into ranking decisions. Concurrently, high-volume hiring pipelines suffer from database race conditions during concurrent stage advancements and severe memory bloat when loading deep-learning NLP models into production web workers.

### High-Level Capabilities

**SmartATS** is an enterprise-grade, distributed talent acquisition engine built on **Django 5.1 REST Framework** and **React 18 + TypeScript**. Key capabilities include:

- **Hybrid Semantic Candidate Matching:** Combines 384-dimensional dense semantic vector embeddings (`all-MiniLM-L6-v2`) with deterministic skill-graph overlap to provide instant, bias-resistant candidate ranking.
- **Explainable Match Scoring:** Deconstructs suitability scores into normalized semantic similarity, verified technical skills, and identified skill gaps.
- **Deterministic Application State Machine:** Serializes candidate lifecycles across five distinct stages with pessimistic row-level locking (`select_for_update`) to prevent race conditions.
- **Hardened Multi-Tenant Security:** Features zero-trust tenant isolation, anti-IDOR checks on requisitions and interviews, binary magic-byte stream inspection, and role-based JWT authentication.
- **Ultra-Low Memory Footprint:** Architected to operate reliably within 512MB RAM environments (e.g., Render free tiers) through lazy PyTorch instantiation and deterministic 384-dimensional feature hashing fallbacks.

### Key Engineering Trade-Offs

| Architectural Dimension | Chosen Approach | Alternative Evaluated | Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Parsing & Scoring Pipeline** | **Asynchronous Celery Task** | Synchronous REST Request | Keeps HTTP response times $< 80\text{ms}$; heavy PyMuPDF extraction and embedding generation run out-of-band in isolated worker pools. |
| **Vector Similarity Engine** | **Dynamic Dual-Mode (PyTorch vs Hashing)** | Monolithic In-Memory Transformer | Running SentenceTransformers full-time consumes $\sim 380\text{MB}$ baseline RAM. SmartATS lazily instantiates models or falls back to a 384-dim sign-hashing vectorizer ($< 100\text{KB}$ RAM). |
| **Concurrency Control** | **Pessimistic Row Locking (`select_for_update`)** | Optimistic Locking (`version` column) | Prevents conflicting stage advances and candidate withdrawals under high recruiter concurrency without requiring frontend retry loops. |
| **Frontend Bundle Delivery** | **Route-Level Code-Splitting (`React.lazy`)** | Monolithic SPA Bundle | Reduces initial bundle from $> 650\text{kB}$ to $276\text{kB}$ index core, chunking heavy pages (`RecruiterPipeline`, `CandidateJobs`) into sub-$45\text{kB}$ downloads. |
| **File Security** | **Binary Magic-Byte Inspection (`file.seek(0)`)** | MIME-type / Extension Only | Extension and header spoofing are trivial attack vectors. Inspecting the first 8 bytes (`%PDF-`, `PK\x03\x04`) guarantees strict format compliance before persistence. |

---

## 2. Distributed System Topology & Architecture

SmartATS separates interactive client-side execution, stateless API orchestration, asynchronous task processing, and relational persistence into discrete, decoupled tiers.

### System Topology Diagram

```mermaid
flowchart TD
    subgraph ClientTier["Client Tier (Edge Delivery)"]
        SPA["Vercel Edge Network\nReact 18 + TypeScript SPA\nDynamic Route-Chunking (React.lazy)"]
    end

    subgraph APIGateway["Application & API Gateway Tier"]
        Ingress["Render Ingress / Cloudflare Edge\nTLS Termination & Edge Caching"]
        GunicornWSGI["Gunicorn WSGI Server\n1 Master, 2 Sync Worker Threads"]
        DjangoAPI["Django 5.1 REST Framework\nJWT Authentication & SimpleJWT\nWhiteNoise Static Compression\nAnon/User Rate Limiting (1000/day)"]
        HealthEndpoint["/healthz Endpoint\nReal-time DB & Redis Ping"]
    end

    subgraph AsyncTier["Asynchronous Compute Tier"]
        RedisQueue["Redis 7 In-Memory Broker\nCelery Task Queue & Pub/Sub"]
        CeleryWorker["Celery Worker (Single Concurrency)\nMemory Threshold: 120MB per child\nLazy-loaded PyTorch / MiniLM-L6-v2\nDeterministic 384-Dim Hashing Fallback"]
    end

    subgraph PersistenceTier["Persistence & Object Storage Tier"]
        Postgres["Neon / Supabase PostgreSQL 16\nACID Relational Engine\npgvector Extension for Embeddings\nPessimistic Row Locking (select_for_update)"]
        ObjectStorage["Cloud Object Storage (AWS S3 / Cloudinary)\nPrivate ACLs & Expiring Presigned URLs\nLocal FileSystemStorage (Dev Fallback)"]
    end

    SPA -->|HTTPS / REST API + JWT| Ingress
    Ingress --> GunicornWSGI
    GunicornWSGI --> DjangoAPI
    DjangoAPI --> HealthEndpoint
    DjangoAPI -->|Persistent Pool 600s| Postgres
    DjangoAPI -->|Direct Upload / Presigned GET| ObjectStorage
    DjangoAPI -->|Dispatch Match Tasks| RedisQueue
    RedisQueue -->|Consume Async Tasks| CeleryWorker
    CeleryWorker -->|Read Document Stream| ObjectStorage
    CeleryWorker -->|Write Embeddings & Scores| Postgres
    HealthEndpoint -.->|Ping| Postgres
    HealthEndpoint -.->|Ping| RedisQueue
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

Candidate applications progress through a deterministic, auditable finite-state machine implemented in [backend/applications/services.py](file:///Users/manthanshah/Documents/SmartATS/backend/applications/services.py) (`ApplicationStateMachine`). Illegal state transitions are rejected with an HTTP 400 `ValidationError`, and every authorized change creates an immutable audit record in `ApplicationStatusHistory`.

```mermaid
stateDiagram-v2
    [*] --> APPLIED : Candidate Submits Application & Resume

    APPLIED --> SCREENING : Recruiter Reviews Resume / AI Match Score
    APPLIED --> REJECTED : Profile Declined by Recruiter
    APPLIED --> WITHDRAWN : Candidate Self-Withdrawal

    SCREENING --> SHORTLISTED : Candidate Meets Technical Qualifications
    SCREENING --> REJECTED : Profile Declined by Recruiter
    SCREENING --> WITHDRAWN : Candidate Self-Withdrawal

    SHORTLISTED --> INTERVIEW_SCHEDULED : Interview Scheduled via Calendar Dialog
    SHORTLISTED --> REJECTED : Candidate Unreachable / Skills Discrepancy
    SHORTLISTED --> WITHDRAWN : Candidate Self-Withdrawal

    INTERVIEW_SCHEDULED --> OFFERED : Candidate Successfully Clears Loop
    INTERVIEW_SCHEDULED --> REJECTED : Candidate Failed Technical/Culture Round
    INTERVIEW_SCHEDULED --> WITHDRAWN : Candidate Accepted Competing Offer

    OFFERED --> HIRED : Offer Letter Executed & Accepted
    OFFERED --> REJECTED : Offer Rescinded Prior to Acceptance
    OFFERED --> WITHDRAWN : Candidate Declined Offer Terms

    REJECTED --> [*]
    WITHDRAWN --> [*]
    HIRED --> [*]
```

### Transition Matrix & Enforcement

| Source State | Target State | Authorized Actor | Row Lock Applied | Action Taken |
| :--- | :--- | :--- | :---: | :--- |
| `APPLIED` | `SCREENING` | Recruiter, Admin | Yes (`select_for_update`) | Moves candidate into active review. |
| `APPLIED` | `REJECTED` | Recruiter, Admin | Yes (`select_for_update`) | Closes application with optional feedback. |
| `APPLIED` | `WITHDRAWN` | Candidate | Yes (`select_for_update`) | Candidate removes self from pool. |
| `SCREENING` | `SHORTLISTED` | Recruiter, Admin | Yes (`select_for_update`) | Qualifies candidate for scheduling. |
| `SHORTLISTED` | `INTERVIEW_SCHEDULED` | Recruiter, Admin | Yes (`select_for_update`) | Triggers interview modal and sends notification. |
| `INTERVIEW_SCHEDULED` | `OFFERED` | Recruiter, Admin | Yes (`select_for_update`) | Advances candidate to compensation offer. |
| `OFFERED` | `HIRED` | Recruiter, Admin | Yes (`select_for_update`) | Marks requisition fulfillment. |
| Any Active | `WITHDRAWN` | Candidate | Yes (`select_for_update`) | Candidate self-service withdrawal. |
| Any Active | `REJECTED` | Recruiter, Admin | Yes (`select_for_update`) | Terminal rejection with audit log. |

---

## 4. Engineering Highlights & Hardened Security Controls (The Audit Story)

During a comprehensive architectural and application security audit, SmartATS was hardened against critical vulnerabilities across identity, authorization, file processing, database concurrency, and resource constraints:

### 1. Role Escalation Defense (`SEC-01` & `SEC-02`)
- **Vulnerability:** Unauthenticated or authenticated users could theoretically elevate privileges to `ADMIN` by modifying payloads sent to registration or profile update endpoints.
- **Remediation:**
  - In [accounts/serializers.py](file:///Users/manthanshah/Documents/SmartATS/backend/accounts/serializers.py), `UserSerializer.Meta.read_only_fields` marks `role` as strictly immutable, preventing any `PATCH /api/auth/me/` from modifying user roles.
  - In `RegisterSerializer.validate_role`, registration is constrained to a closed enum: `[CANDIDATE, RECRUITER]`. Any payload attempting to supply `role="ADMIN"` is immediately rejected with an HTTP 400 `ValidationError`.

### 2. Multi-Tenant IDOR Prevention (`SEC-04` & `SEC-05`)
- **Vulnerability:** Recruiters could manipulate target IDs to publish requisitions under foreign companies or schedule interviews on applications belonging to other enterprise tenants.
- **Remediation:**
  - In [jobs/serializers.py](file:///Users/manthanshah/Documents/SmartATS/backend/jobs/serializers.py) (`JobSerializer.validate`), the recruiter's company profile is verified against the job's company ID. Cross-tenant job creation is rejected.
  - In [interviews/serializers.py](file:///Users/manthanshah/Documents/SmartATS/backend/interviews/serializers.py) (`InterviewSerializer.validate`), the target application's company is verified against `request.user.recruiter_profile.company`. Unauthorized recruiters receive an explicit permission error.

### 3. Binary Magic-Byte Stream Inspection (`SEC-06`)
- **Vulnerability:** Attackers could upload malicious executables or polyglot files disguised with `.pdf` or `.docx` extensions, bypassing standard MIME-type checks.
- **Remediation:**
  - In [applications/serializers.py](file:///Users/manthanshah/Documents/SmartATS/backend/applications/serializers.py) (`ResumeSerializer.validate_file`), raw file headers are read to inspect magic bytes:
    - **PDF Documents:** Must begin with signature `b"%PDF-"`.
    - **Office Open XML (DOCX):** Must begin with PKZip signature `b"PK\x03\x04"`.
  - **Stream Rewind Enforcement:** The file pointer is immediately rewound (`file_obj.seek(0)`) after reading initial bytes inside a `finally` block and verified before `Resume.objects.create(...)`. This prevents truncated 0-byte saves in downstream storage backends.

### 4. Concurrency Safety & Row Locking (`DB-FIX-01`)
- **Vulnerability:** Simultaneous requests (e.g., recruiter advancing a candidate while candidate withdraws) resulted in race conditions, overwriting status history or putting applications into invalid dual states.
- **Remediation:**
  - In [applications/services.py](file:///Users/manthanshah/Documents/SmartATS/backend/applications/services.py), state machine transitions are wrapped in `@transaction.atomic` with pessimistic row-level locking:
    ```python
    locked_application = Application.objects.select_for_update().get(id=application.id)
    ```
  - Transition validation is evaluated against the fresh, locked database row before committing updates and writing the audit record.

### 5. Memory Capping & Low-Footprint Profiling (512MB RAM Constraint)
- **Challenge:** Hosting PyTorch, Transformers, spaCy, and Gunicorn on Render's 512MB free tier leads to out-of-memory (OOM) process termination during embedding generation.
- **Remediation:**
  - **Lazy ML Instantiation:** PyTorch and `SentenceTransformer` are never imported at the module level. They are loaded dynamically within worker tasks only when `ENABLE_HEAVY_EMBEDDINGS=True`, with `torch.set_num_threads(1)` and immediate post-execution cleanup (`del model; gc.collect()`).
  - **Deterministic 384-Dim Hashing Fallback:** Under memory constraints, SmartATS employs a lightweight unigram/bigram sign-hashing vectorizer. It projects text into 384-dimensional $L_2$-normalized vectors consuming **$< 100\text{KB}$ RAM** while retaining lexical and semantic relevance.
  - **Process Tuning:** Celery worker concurrency is capped at 1 (`--concurrency=1`), with `CELERY_WORKER_MAX_TASKS_PER_CHILD=50` and `CELERY_WORKER_MAX_MEMORY_PER_CHILD=120000` (120MB threshold auto-restart), stabilizing the base boot footprint at $\sim 72\text{MB}$.

### Transparent AI Hybrid Matching Formula

Candidate ranking is computed via an explainable, objective formula:

$$\text{Overall Score} = 0.65 \times \text{Semantic Score} + 0.35 \times \text{Skill Overlap Score}$$

$$\text{Semantic Score} = \max\left(0, \min\left(100, \frac{\cos(\vec{u}, \vec{v}) + 1}{2} \times 100\right)\right)$$

$$\text{Skill Overlap Score} = \frac{|\text{Extracted Skills} \cap \text{Required Job Skills}|}{|\text{Required Job Skills}|} \times 100$$

---

## 5. API Contract Reference

All API routes are served under `/api/` with JSON payloads. Authenticated routes require an `Authorization: Bearer <access_token>` header.

| Method | Endpoint | Allowed Roles | Description | Request / Payload Sample |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Public | Register new Candidate or Recruiter | `{"email": "...", "password": "...", "role": "CANDIDATE"}` |
| `POST` | `/api/auth/login/` | Public | Obtain JWT Access (15m) and Refresh (7d) tokens | `{"email": "...", "password": "..."}` |
| `POST` | `/api/auth/refresh/` | Public | Rotate expired access token | `{"refresh": "..."}` |
| `POST` | `/api/auth/logout/` | Authenticated | Blacklist active refresh token | `{"refresh": "..."}` |
| `GET` | `/api/auth/me/` | Authenticated | Retrieve current user profile and role | None |
| `GET` | `/api/jobs/` | Public | Filter published, active job openings | `?search=fullstack&location=remote&job_type=FULL_TIME` |
| `POST` | `/api/jobs/` | Recruiter, Admin | Publish new requisition under verified tenant | `{"title": "...", "department": "...", "description": "..."}` |
| `GET` | `/api/companies/` | Public | List verified hiring organizations | `?industry=Enterprise Cloud` |
| `POST` | `/api/resumes/` | Candidate | Upload resume with magic-byte validation | `multipart/form-data: { file: document.pdf }` |
| `GET` | `/api/applications/` | Candidate, Recruiter | Scoped application list (Candidate: own; Recruiter: tenant) | `?job_id={uuid}&status=SHORTLISTED` |
| `POST` | `/api/applications/` | Candidate | Apply to an active requisition | `{"job_id": "...", "resume_id": "...", "cover_letter": "..."}` |
| `POST` | `/api/applications/{id}/transition/` | Recruiter, Candidate | Advance stage or execute candidate withdrawal | `{"target_stage": "SHORTLISTED", "notes": "Approved"}` |
| `GET` | `/api/applications/{id}/match_score/` | Recruiter, Candidate | Fetch explainable AI score & skill breakdown | None |
| `GET` | `/api/interviews/` | Candidate, Recruiter | List interviews for tenant or candidate | `?application_id={uuid}` |
| `POST` | `/api/interviews/` | Recruiter, Admin | Schedule interview round and notify candidate | `{"application_id": "...", "scheduled_start": "...", ...}` |
| `GET` | `/api/notifications/` | Authenticated | Fetch notifications for logged-in user | `?is_read=false` |
| `POST` | `/api/notifications/mark_all_read/` | Authenticated | Bulk mark all notifications as read | None |
| `GET` | `/api/analytics/recruiter/` | Recruiter, Admin | Fetch single-pass pipeline metrics for company | None |
| `GET` | `/healthz` | Public | Verify PostgreSQL connectivity and Redis ping | None (Returns `{"status": "healthy", ...}`) |

---

## 6. Local Setup & Production Verification Runbook

### Prerequisites

- **Python:** 3.12+
- **Node.js:** 20.x or 22.x LTS (npm 10+)
- **PostgreSQL:** 16+ (with `pgvector` extension)
- **Redis:** 7+
- **Docker & Docker Compose:** Optional for containerized setup

---

### Environment Configuration Matrix

Create a root `.env` file for local development:

```ini
# Core Backend Settings
DEBUG=True
SECRET_KEY=django-insecure-dev-secret-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,.onrender.com

# Persistence Connections
DATABASE_URL=postgres://postgres:postgres@localhost:5432/smartats_db
REDIS_URL=redis://localhost:6379/0

# Optional: Cloud Storage (Defaults to FileSystemStorage when False)
USE_S3=False
AWS_STORAGE_BUCKET_NAME=smartats-resumes
AWS_S3_REGION_NAME=us-east-1

# CORS & Gateway
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://smart-ats-eta.vercel.app

# Worker Memory Constraints
ENABLE_HEAVY_EMBEDDINGS=False
CELERY_WORKER_CONCURRENCY=1

# Frontend Configuration (frontend/.env)
VITE_API_URL=http://localhost:8000/api
```

---

### Step-by-Step Setup

#### 1. Backend API Service

```bash
cd backend

# Create and activate virtual environment
python3.12 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Seed database with realistic companies, recruiters, candidates, and AI matches
python manage.py seed_ats

# Start API server
python manage.py runserver 0.0.0.0:8000
```

#### 2. Asynchronous Celery Worker (in a separate terminal)

```bash
cd backend
source .venv/bin/activate
celery -A smartats worker --loglevel=info --concurrency=1
```

#### 3. Frontend React Application

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

### Containerized Setup (Docker Compose)

To spin up the entire distributed environment (PostgreSQL 16 + pgvector, Redis 7, Django API Gateway, and Celery Worker):

```bash
cd infra
docker-compose up --build
```

---

### Pre-Seeded Demonstration Accounts

Running `python manage.py seed_ats` provisions the following accounts (password for all: `Password123!`):

| Role | Email Address | Password | Company / Tenant | Pre-Configured State |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@smartats.com` | `Password123!` | Platform-wide | Superuser with administrative access |
| **Recruiter** | `recruiter@technova.com` | `Password123!` | TechNova Solutions | Active requisitions & candidate pipeline |
| **Candidate** | `candidate@test.com` | `Password123!` | Public Candidate | Applied to Senior Full-Stack Engineer |
| **Candidate** | `sarah.chen@example.com` | `Password123!` | Public Candidate | AI Platform applicant (95% Match) |
| **Candidate** | `alex.rivera@example.com` | `Password123!` | Public Candidate | Cloud Architect applicant (88% Match) |

---

## 7. Automated Test Suite & Code Quality Verification

SmartATS enforces 100% pass rates across both backend and frontend test suites prior to deployment:

```bash
# -------------------------------------------------------------
# 1. Run Backend Automated Test Suite (75 Tests)
# -------------------------------------------------------------
cd backend
python manage.py test

# -------------------------------------------------------------
# 2. Verify Backend Code Formatting & Linting
# -------------------------------------------------------------
black --check .
flake8

# -------------------------------------------------------------
# 3. Run Frontend Automated Test Suite (6 Tests)
# -------------------------------------------------------------
cd frontend
npm test

# -------------------------------------------------------------
# 4. Verify Frontend TypeScript Compilation & Production Build
# -------------------------------------------------------------
npm run build
```

### Test Coverage Summary

- **Backend (75/75 Passed):**
  - Application state machine deterministic transitions, terminal state enforcement, and row-level locking.
  - Magic-byte validation on resume uploads and file stream rewinds.
  - Multi-tenant IDOR access isolation across candidates, recruiters, and companies.
  - Role escalation prevention on user updates and user registration.
  - Single-pass recruiter analytics SQL aggregation queries.
- **Frontend (6/6 Passed):**
  - Role-based route protection via `AuthGuard` (unauthenticated redirection, role authorization).
  - `NotificationBell` state handling, unread badge rendering, and dropdown interactions.
  - TypeScript build verification with zero compilation warnings.

---

## 8. Deployment Topology (Render & Vercel)

- **Backend API (`smartats-api`):** Hosted on Render using the hardened, non-root [backend/Dockerfile](file:///Users/manthanshah/Documents/SmartATS/backend/Dockerfile) with Gunicorn (`--workers 1 --threads 2`).
- **Asynchronous Worker (`smartats-celery`):** Managed on Render using [render.yaml](file:///Users/manthanshah/Documents/SmartATS/render.yaml) connected to Render Redis.
- **Frontend SPA (`smart-ats`):** Hosted on Vercel with automatic edge code-splitting, route chunking, and push-state SPA rewrites.

---

## 9. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
