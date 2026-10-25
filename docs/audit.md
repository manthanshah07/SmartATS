# Audit & Compliance Checklist — SmartATS

## 1. Audit Framework Overview
This document specifies the verification, security, compliance, and code quality audits required before SmartATS moves to staging and production environments.

---

## 2. Security Audit (OWASP Top 10 Guardrails)

### 2.1 Authentication & Session Integrity
- [ ] **JWT Key Strength**: Verify `SECRET_KEY` and JWT signing keys are cryptographically random strings (min 64 chars) sourced strictly from environment variables.
- [ ] **Token Expiry**: Confirm access tokens expire within 15 minutes and refresh tokens expire in 7 days.
- [ ] **Token Blacklisting**: Ensure every logout request executes `rest_framework_simplejwt.token_blacklist` to invalidate refresh tokens.
- [ ] **Password Security**: Enforce minimum 8 characters, requiring at least one number and special character; verify passwords use PBKDF2 with SHA-256 or Argon2.

### 2.2 Role-Based Access Control (RBAC) & IDOR Defense
- [ ] **Endpoint Permission Classes**: Audit all DRF views to ensure no protected endpoint relies solely on `AllowAny`.
- [ ] **Object-Level Permissions**: Prevent Insecure Direct Object References (IDOR) by verifying that recruiters can only access candidates applying to their company's jobs.
- [ ] **Candidate Isolation**: Ensure candidates can only read and update their own profile and applications.

### 2.3 Injection & Input Sanitization
- [ ] **SQL Injection Defense**: Verify all database interactions utilize the Django ORM without raw, unparameterized SQL queries (`raw()` or `extra()`).
- [ ] **Cross-Site Scripting (XSS)**: Ensure React's default JSX escaping is respected and any rich-text preview uses DOMPurify sanitization.
- [ ] **File Upload Validation**:
  - Restrict file extensions to `.pdf`, `.docx`.
  - Validate MIME types server-side (`python-magic`) to prevent executable files masked as PDFs.
  - Limit upload size strictly to 5MB.
  - Store uploaded files outside the public web root.

### 2.4 Network, CORS & Transport Security
- [ ] **CORS Configuration**: Restrict `CORS_ALLOWED_ORIGINS` to explicit frontend production domains (never use `CORS_ALLOW_ALL_ORIGINS = True`).
- [ ] **Rate Limiting**: Apply API rate limiting on login, registration, and file upload endpoints via `django-ratelimit` or Redis token buckets.
- [ ] **Security Headers**: Enable `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SECURE_CONTENT_TYPE_NOSNIFF`, and `X_FRAME_OPTIONS = 'DENY'`.

---

## 3. AI & Fair Hiring Compliance

### 3.1 Algorithmic Fairness & Bias Mitigation
- [ ] **PII Masking / Blind Screening**: Ensure demographic indicators (gender, age, race, photos, addresses) are excluded from the semantic embedding input string.
- [ ] **Deterministic Scoring**: Validate that candidate scoring is grounded strictly in skills, work experience, and job description semantic overlap.
- [ ] **Human-in-the-Loop Guarantee**: Enforce that the AI matching engine acts solely as an advisory ranking tool; no automated rejection or hiring decision can be made without explicit recruiter action.

### 3.2 Explainability & Transparency
- [ ] **Skill Gap Transparency**: Ensure every match score presents an itemized list of matching skills, missing skills, and criteria weights.
- [ ] **Candidate Insight**: Provide candidate feedback showing skill gaps relative to the job requirements to promote transparent candidate experiences.

---

## 4. Performance & Scalability Audit

### 4.1 Database Optimization
- [ ] **N+1 Query Elimination**: Audit ORM queries using `django-debug-toolbar` or `django-silk`. Ensure all nested queries utilize `select_related` and `prefetch_related`.
- [ ] **Index Verification**: Confirm indexes exist on all foreign keys (`job_id`, `company_id`, `candidate_id`), status columns, and timestamp fields.
- [ ] **Vector Query Latency**: Verify `pgvector` HNSW index latency stays under 50ms across benchmark vector sets.

### 4.2 Asynchronous Worker Health
- [ ] **Worker Decoupling**: Confirm that no resume extraction or Sentence Transformer embedding runs on the web Gunicorn worker thread.
- [ ] **Task Idempotency**: Ensure Celery tasks can be safely retried without creating duplicate database records.
- [ ] **Dead-Letter Queue & Retries**: Configure exponential backoff with max 3 retries for transient parsing failures.

---

## 5. Code Quality & CI/CD Quality Gates
- [ ] **Linting Standards**: Ensure zero errors with `flake8`, `black`, and `isort` for Python; zero errors with `eslint` and `prettier` for TypeScript.
- [ ] **Test Coverage**: Achieve > 85% automated test coverage across models, serializers, state machine transitions, and API views.
- [ ] **Automated GitHub Actions**: Guarantee that every PR passes automated lint, test, and Docker build checks before merging to main.
