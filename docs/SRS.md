# Software Requirements Specification (SRS) — SmartATS

## 1. Introduction
### 1.1 Purpose
This Software Requirements Specification (SRS) defines the functional and non-functional requirements for the **SmartATS** system. It specifies system capabilities, architectural interfaces, performance criteria, security guardrails, and compliance benchmarks for developers and stakeholders.

### 1.2 Scope
SmartATS is an automated, AI-driven Applicant Tracking System designed to manage job requisitions, candidate resumes, semantic vector-based candidate matching, interview scheduling, and recruitment pipeline analytics.

### 1.3 Definitions, Acronyms, and Abbreviations
* **ATS**: Applicant Tracking System
* **RBAC**: Role-Based Access Control
* **JWT**: JSON Web Token
* **NER**: Named Entity Recognition (spaCy)
* **Cosine Similarity**: Mathematical metric measuring the cosine of the angle between two non-zero vectors in an inner product space.
* **HNSW**: Hierarchical Navigable Small World (indexing algorithm for fast approximate nearest neighbor search in vector databases).
* **NFR**: Non-Functional Requirement

---

## 2. Overall System Description
### 2.1 Product Perspective
SmartATS operates as a decoupled client-server architecture consisting of a modern React SPA frontend communicating over HTTPS/JSON REST APIs with a Django REST Framework backend, supported by an asynchronous worker queue (Celery + Redis), a PostgreSQL 16 relational database with `pgvector`, and a local ML inference engine.

### 2.2 User Classes and Characteristics
* **Candidate**: End-user seeking employment. Can manage resumes, apply to job openings, view match scores, and track application stages.
* **Recruiter**: Hiring professional associated with a verified company. Can create job postings, review ranked candidates, inspect skill match breakdowns, schedule interviews, and transition application statuses.
* **Admin**: Platform supervisor with full system governance, company verification privileges, and access to system-wide audit logs.

### 2.3 Operating Environment
* **Client**: Modern web browsers (Chrome, Firefox, Safari, Edge) supporting ES2022.
* **Server**: Linux container runtime (Ubuntu 22.04 LTS / Alpine), Python 3.12+, Node.js 18+.
* **Database**: PostgreSQL 16 with `pgvector` extension.
* **Message Broker**: Redis 7.x (or Upstash Serverless Redis).

---

## 3. Specific Functional Requirements (FR)

### 3.1 Authentication & User Management
* **FR-01**: The system shall support user registration with designated roles: `candidate` or `recruiter`.
* **FR-02**: The system shall implement stateless JWT authentication with short-lived access tokens (15 minutes) and long-lived refresh tokens (7 days).
* **FR-03**: The system shall enforce server-side refresh token blacklisting upon logout to prevent replay attacks.
* **FR-04**: The system shall enforce Role-Based Access Control (RBAC) on all protected endpoints.

### 3.2 Company & Job Requisition Management
* **FR-05**: Recruiters shall be able to register and manage company profiles, including logos, industry, size, and verified domains.
* **FR-06**: Recruiter accounts must be approved or verified prior to publishing public job requisitions.
* **FR-07**: Recruiters shall be able to create, read, update, and close job postings with structured criteria (title, department, location, job type, salary range, required skills, preferred skills, and raw description).
* **FR-08**: The system shall support full-text search and multi-facet filtering on active job listings.

### 3.3 Resume Ingestion & Parsing
* **FR-09**: Candidates shall be able to upload resume files in PDF and DOCX formats (max file size 5MB).
* **FR-10**: The system shall sanitize file uploads, verifying MIME types and preventing executable code execution.
* **FR-11**: The system shall extract raw text from uploaded resumes using high-speed text extraction libraries (`pdfplumber` / `PyMuPDF`).
* **FR-12**: The parsing engine shall extract structured candidate metadata: contact details, education history, work experience, and technical/soft skills via `spaCy` NER.

### 3.4 AI Matching & Explainability Engine
* **FR-13**: The system shall generate 384-dimensional dense semantic embeddings for both job descriptions and candidate resumes using `sentence-transformers/all-MiniLM-L6-v2`.
* **FR-14**: The system shall store and index resume embeddings using PostgreSQL `pgvector` with HNSW/IVFFlat indexes.
* **FR-15**: The matching engine shall compute an overall match percentage (0–100%) using a hybrid formula:
  $$	ext{Score} = w_1 \cdot 	ext{CosineSimilarity}(ec{V}_{	ext{job}}, ec{V}_{	ext{resume}}) + w_2 \cdot 	ext{SkillOverlapRatio}$$
  *(Default weights: $w_1 = 0.65$, $w_2 = 0.35$)*.
* **FR-16**: The engine must return an explainable audit report detailing:
  1. Matched required skills.
  2. Missing required skills (skill gaps).
  3. Matched preferred/bonus skills.
  4. Contextual experience relevance summary.

### 3.5 Asynchronous Processing
* **FR-17**: Resume parsing, entity extraction, and embedding generation must execute asynchronously via Celery worker queues without blocking HTTP web threads.
* **FR-18**: The system shall track task execution states (`PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`) and update database status accordingly.

### 3.6 Application State Machine
* **FR-19**: The system shall manage candidate applications using a deterministic finite state machine with the following allowed states:
  * `APPLIED` -> `SCREENING` -> `SHORTLISTED` -> `INTERVIEW_SCHEDULED` -> `OFFERED` / `REJECTED` / `WITHDRAWN`.
* **FR-20**: The system shall reject invalid state transitions (e.g., transitioning directly from `APPLIED` to `OFFERED` without passing through intermediate stages).
* **FR-21**: Every status change must create an immutable audit record in `application_status_history` logging the previous state, new state, user ID, timestamp, and optional transition notes.

### 3.7 Interview Coordination & Notifications
* **FR-22**: Recruiters shall be able to schedule interview rounds specifying date, time, duration, interviewer list, interview type, and meeting URL.
* **FR-23**: The system shall generate downloadable `.ics` calendar invite files for scheduled interviews.
* **FR-24**: The system shall dispatch event-driven in-app notifications and email alerts upon status changes or interview scheduling.

### 3.8 Recruitment Analytics
* **FR-25**: The system shall compute pipeline conversion metrics, including applicant volume by job, stage drop-off rates, and average time-to-hire.

---

## 4. Non-Functional Requirements (NFR)

### 4.1 Performance Requirements
* **NFR-01**: Read API endpoints shall have a P95 response latency under 200ms under standard load (100 concurrent users).
* **NFR-02**: Asynchronous resume parsing, embedding generation, and scoring shall complete in < 4.0 seconds for standard documents.
* **NFR-03**: Vector similarity queries across 50,000 resume vectors in `pgvector` shall complete in < 50ms using HNSW indexing.

### 4.2 Security Requirements
* **NFR-04**: Passwords must be hashed using PBKDF2 with SHA-256 (Django default) or Argon2.
* **NFR-05**: All REST API endpoints handling private candidate data must require authenticated authorization headers.
* **NFR-06**: Uploaded files must be stored in secure private object storage or restricted filesystem paths, never served directly as executable media.
* **NFR-07**: Cross-Origin Resource Sharing (CORS) shall be restricted strictly to whitelisted frontend origin domains.

### 4.3 Reliability & Availability
* **NFR-08**: The system shall target 99.9% uptime.
* **NFR-09**: Background Celery tasks must be idempotent to prevent duplicate processing on worker retries.

### 4.4 Usability & Accessibility
* **NFR-10**: The user interface shall adhere to WCAG 2.1 AA standards, utilizing accessible ARIA attributes and full keyboard navigation via shadcn/ui.
