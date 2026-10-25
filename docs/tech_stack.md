# Technology Stack Specification — SmartATS

## 1. Architectural Philosophy
The SmartATS technology stack is chosen according to four core architectural principles:
1. **Zero Recurring AI Costs**: Use local open-source models for NLP and vector embeddings instead of paid proprietary LLM APIs.
2. **Decoupled Architecture**: Strict separation between the client presentation layer and backend API services.
3. **Asynchronous Resilience**: Heavy machine learning inference and PDF extraction must never block HTTP web requests.
4. **Strong Typing & Safety**: TypeScript on the frontend and Django's strict ORM validation on the backend.

---

## 2. Technology Selection Matrix

| Layer | Technology | Version | Justification & Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend Core** | **React** | `18.3.x` | Industry standard component model, concurrent rendering, rich ecosystem. |
| **Build Tool** | **Vite** | `5.x` | Sub-second HMR, optimized Rollup bundling, instant development server startup. |
| **Language (Frontend)**| **TypeScript** | `5.x` | Static type safety, interface sharing with API contracts, reduced runtime errors. |
| **Styling & UI** | **Tailwind CSS + shadcn/ui** | `3.4.x / Radix` | Zero-runtime CSS, fully accessible WAI-ARIA primitives, complete design control without library lock-in. |
| **Client State / Cache**| **TanStack Query** | `v5` | Robust asynchronous server state caching, automatic background refetching, pagination, and optimistic updates. |
| **Form Handling** | **React Hook Form + Zod**| Latest | Uncontrolled performance, declarative schema validation matching backend DTOs. |
| **Backend Framework** | **Django & Django REST Framework** | `5.1.x / 3.15.x` | Mature batteries-included web framework, robust ORM, built-in security, standard REST tooling. |
| **Language (Backend)** | **Python** | `3.12` | Native ecosystem for machine learning, data processing, and enterprise backend engineering. |
| **Authentication** | **SimpleJWT** | `5.3.x` | Stateless token authentication with configurable rotation and server-side blacklisting. |
| **Asynchronous Queue** | **Celery** | `5.4.x` | Distributed task execution for handling compute-heavy resume extraction and embedding generation. |
| **Message Broker** | **Redis** | `7.x` | Low-latency in-memory data store for Celery task queuing and temporary caching. |
| **Relational Database** | **PostgreSQL** | `16.x` | ACID compliance, robust indexing, high-performance concurrency. |
| **Vector Engine** | **`pgvector`** | `0.7.x` | Native PostgreSQL extension for storing embeddings and executing fast cosine distance queries (HNSW). |
| **NLP & Entity Extraction**| **spaCy** | `3.7.x (en_core_web_sm)` | High-speed, deterministic Named Entity Recognition for candidate skills, companies, and education. |
| **Sentence Embeddings**| **Sentence Transformers** | `3.x (all-MiniLM-L6-v2)` | Fast, 384-dimensional dense vector embeddings optimized for semantic search with minimal RAM footprint (~120MB). |
| **Document Text Extraction**| **PyMuPDF / pdfplumber**| Latest | Fast, reliable extraction from multi-column PDF resumes without requiring cloud OCR APIs. |
| **Matrix Math & Scoring**| **scikit-learn / NumPy** | Latest | Cosine similarity calculations, normalization, and statistical analytics. |

---

## 3. $0 Cloud Hosting & Infrastructure Blueprint

SmartATS is architected so that the complete stack can be hosted in production for **$0 / month** using free-tier services:

```
┌────────────────────────┐      ┌─────────────────────────┐
│     Vercel (Free)      │      │     Render / Fly.io     │
│   React 18 + Vite SPA  ├─────►│  Django 5.1 REST API    │
└────────────────────────┘      └────────────┬────────────┘
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       │                     │                     │
                       ▼                     ▼                     ▼
             ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
             │    Neon (Free)    │ │  Upstash (Free)   │ │  Celery Worker    │
             │   PostgreSQL 16   │ │ Serverless Redis  │ │ (Embedded/Fly.io) │
             │  with `pgvector`  │ │  (10k cmds/day)   │ │ ML Parsing Queue  │
             └───────────────────┘ └───────────────────┘ └───────────────────┘
```

* **Frontend**: **Vercel** (Free Tier) — Global edge CDN, automated GitHub deployments, SSL.
* **Backend API**: **Render** or **Fly.io** (Free Tier / Hobby) — Docker container running Gunicorn.
* **Database**: **Neon** (Free Tier) — Serverless PostgreSQL 16 with 0.5 GB storage, instant branching, and native `pgvector` pre-installed.
* **Message Broker**: **Upstash Redis** (Free Tier) — Serverless Redis with 10,000 commands/day, perfectly sized for background task dispatching.
* **Worker Execution**: Single-instance container execution running Celery alongside Django, or hosted on Fly.io's free compute allowance.

---

## 4. Scaled Enterprise Production Blueprint

When migrating to paid enterprise infrastructure:
* **Compute**: AWS ECS (Fargate) or Kubernetes (EKS) separating web pods from dedicated GPU/CPU worker pods.
* **Database**: AWS Aurora PostgreSQL with multi-AZ replication and `pgvector`.
* **Storage**: AWS S3 with pre-signed URLs and CloudFront CDN for encrypted resume document storage.
* **Broker**: Managed AWS ElastiCache for Redis.
