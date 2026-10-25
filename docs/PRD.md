# Product Requirements Document (PRD) — SmartATS

## 1. Document Overview
* **Product Name**: SmartATS (AI-Powered Applicant Tracking System)
* **Document Version**: 1.0.0
* **Status**: Approved for Engineering
* **Author / Architecture Lead**: Engineering Architecture Team
* **Target Audience**: Full-Stack Engineers, ML Engineers, Product Managers, QA

---

## 2. Product Vision & Problem Statement

### 2.1 The Problem
Traditional Applicant Tracking Systems (ATS) and recruitment workflows suffer from three major systemic failures:
1. **Keyword-Filter Fragility**: Legacy ATS software relies on exact keyword matching, rejecting qualified candidates who use alternative phrasing (e.g., matching "AWS" but missing "Cloud Infrastructure").
2. **Opaque & Costly LLM Wrappers**: Modern "AI ATS" tools often wrap commercial third-party LLMs (e.g., OpenAI API), resulting in astronomical per-token cloud costs, severe privacy concerns regarding candidate data, and uninterpretable "hallucinated" ratings.
3. **Recruiter Cognitive Fatigue**: High applicant volumes lead to superficial human reviews, lengthy time-to-hire metrics (industry average 42 days), and poor candidate communication.

### 2.2 Product Vision
SmartATS is a full-stack, enterprise-grade hiring platform that democratizes AI recruitment through **local, open-source NLP and semantic vector embeddings**. It delivers sub-second, transparent, and explainable candidate-job matching at **$0 recurring inference cost**, wrapped in an intuitive, role-based application lifecycle manager.

---

## 3. Goals & Non-Goals

### 3.1 Primary Goals (In Scope)
* **Explainable Matching**: Produce a 0–100% semantic match score with granular skill breakdown (Matched Skills vs. Missing Critical Skills) rather than black-box evaluations.
* **Zero-Cost Inference**: Run all NLP extraction and vector embeddings locally using open-source models (`all-MiniLM-L6-v2` and `spaCy`).
* **Non-Blocking Architecture**: Decouple document parsing and ML embedding generation from the HTTP request cycle using asynchronous background workers (Celery + Redis).
* **Formal Application State Machine**: Enforce strict lifecycle transitions (`Applied` -> `Screening` -> `Shortlisted` -> `Interview Scheduled` -> `Offer Extended` / `Rejected`) to eliminate data corruption.
* **Role-Based Access Control (RBAC)**: Secure multi-tenant experiences for Candidates, Recruiters, and Platform Admins.

### 3.2 Non-Goals (Out of Scope for Initial Launch)
* Fully automated hiring decisions without human recruiter sign-off (anti-bias / human-in-the-loop guarantee).
* Native video streaming or in-app live video calling (external meeting link integration only).
* Direct payroll or post-hire HRIS synchronization.

---

## 4. User Personas & Core Journeys

| Persona | Primary Needs & Frustrations | Core User Journey |
| :--- | :--- | :--- |
| **Job Candidate** | Wants feedback on application status and insight into why their resume did or did not match job criteria. | Signs up -> Completes profile -> Uploads resume -> Browses jobs -> Applies -> Receives explainable match insights & status notifications. |
| **Recruiter / Hiring Manager** | Overwhelmed with incoming resumes; needs fast ranking based on genuine semantic fit and streamlined candidate pipeline management. | Creates company profile -> Posts job requisition with required/nice-to-have skills -> Reviews ranked candidate list -> Inspects skill gap matrix -> Moves candidates through state machine -> Schedules interviews. |
| **Platform Administrator** | Needs oversight of platform health, company verification, data compliance, and user management. | Verifies new employer accounts -> Monitors job postings -> Inspects audit logs -> Tracks system health and processing latency. |

---

## 5. Key Features & Specifications

### 5.1 Authentication & Multi-Tenancy (RBAC)
* JWT-based authentication using `access` (15m expiry) and `refresh` (7d expiry) tokens.
* Server-side refresh token blacklisting upon logout.
* Strict role boundaries enforced at database and API view levels.

### 5.2 Resume Parsing & Explainable AI Matching
* **Document Ingestion**: Accept PDF and DOCX formats (max 5MB).
* **Entity & Skill Extraction**: Extract text, contact info, education, work experience, and technical competencies using `spaCy` NER and pattern matchers.
* **Vector Embeddings**: Generate 384-dimensional dense vectors using `sentence-transformers/all-MiniLM-L6-v2`.
* **Cosine Similarity & Skill Overlap**: Calculate holistic semantic similarity and exact skill coverage.
* **Explainable Feedback Output**:
  * Semantic Match Score (0–100%)
  * Matched Skills Matrix
  * Missing / Recommended Skills Gap
  * Experience Alignment Index

### 5.3 Recruitment Pipeline Management
* Kanban-style or tabular applicant tracking board.
* Stage transition validations (preventing out-of-order transitions).
* Batch status updates with automated candidate email/in-app notifications.

### 5.4 Interview Scheduling
* Multi-round scheduling (Screening, Technical, Cultural, Executive).
* Calendar integration via `.ics` file generation and web meeting link distribution.
* Structured recruiter feedback forms and scorecard tracking.

---

## 6. Success Metrics & KPIs
* **Matching Speed**: Resume parsing and vector embedding generation completed in < 4.0 seconds asynchronously.
* **API Responsiveness**: P95 API response time < 250ms for standard CRUD endpoints.
* **Recruiter Screening Time**: 60% reduction in manual resume review time per applicant.
* **Inference Cost**: $0 external API fees for resume parsing, embedding, and matching.
* **Reliability**: 99.9% uptime with zero data loss on application state transitions.

---

## 7. Phased Release Strategy
* **Phase 1 (MVP)**: Auth + RBAC, Job Creation, Resume Upload, Async Parsing & Basic AI Match Score, Kanban Pipeline.
* **Phase 2 (V1 Release)**: Advanced Explainability Breakdown, Interview Scheduling, In-app Notifications, Audit Trails.
* **Phase 3 (V2 Enterprise)**: Advanced Analytics Dashboard, Vector Search with `pgvector`, Blind Screening Mode (PII Redaction), Bulk Candidate Exports.
