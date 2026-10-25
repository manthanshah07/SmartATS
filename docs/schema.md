# Database Schema Specification — SmartATS

## 1. Entity-Relationship Overview

```
┌──────────────────┐          ┌───────────────────────────┐
│      users       │◄────┬────┤     candidate_profiles    │
└────────┬─────────┘     │    └─────────────┬─────────────┘
         │               │                  │
         │               │                  ▼
         │               │    ┌───────────────────────────┐
         │               │    │          resumes          │
         │               │    └──────┬──────────────┬─────┘
         │               │           │              │
         │               │           ▼              ▼
         │               │    ┌──────────────┐┌───────────────┐
         │               │    │ resume_parsed││resume_        │
         │               │    │ _data        ││embeddings     │
         │               │    └──────────────┘│(vector 384)   │
         │               │                    └───────────────┘
         │               ▼                          ▲
         │        ┌──────────────┐                  │
         ├───────►│recruiter_    │                  │
         │        │profiles      │                  │
         │        └──────┬───────┘                  │
         │               ▼                          │
         │        ┌──────────────┐                  │
         ├───────►│  companies   │                  │
         │        └──────┬───────┘                  │
         │               ▼                          │
         │        ┌──────────────┐                  │
         ├───────►│     jobs     │◄────────┐        │
         │        └──────┬───────┘         │        │
         │               │                 │        │
         │               ▼                 │        │
         │        ┌──────────────┐         │        │
         │        │  job_skills  │         │        │
         │        └──────────────┘         │        │
         │                                 │        │
         │        ┌────────────────────────┴───┐    │
         └───────►│        applications        ├────┘
                  └──────┬──────────────┬──────┘
                         │              │
                         ▼              ▼
          ┌─────────────────────┐┌──────────────┐
          │  application_status ││ match_scores │
          │  _history           │└──────────────┘
          └─────────────────────┘
```

---

## 2. Table Definitions & DDL Specifications

### 2.1 Extension Setup (PostgreSQL)
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### 2.2 `users` (Custom User Model)
```sql
CREATE TYPE user_role AS ENUM ('CANDIDATE', 'RECRUITER', 'ADMIN');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CANDIDATE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    date_joined TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### 2.3 `candidate_profiles` & `recruiter_profiles`
```sql
CREATE TABLE candidate_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(25),
    headline VARCHAR(255),
    bio TEXT,
    location VARCHAR(150),
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recruiter_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    title VARCHAR(150),
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 `companies`
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    website VARCHAR(255),
    logo_url VARCHAR(500),
    industry VARCHAR(100),
    description TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.5 `jobs` & `job_skills`
```sql
CREATE TYPE job_type_enum AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE');

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    location VARCHAR(150),
    job_type job_type_enum NOT NULL DEFAULT 'FULL_TIME',
    salary_min NUMERIC(12, 2),
    salary_max NUMERIC(12, 2),
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_active ON jobs(is_active);

CREATE TABLE job_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_skills_name ON job_skills(skill_name);
```

### 2.6 `resumes`, `resume_parsed_data` & `resume_embeddings`
```sql
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resume_parsed_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID UNIQUE NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    extracted_text TEXT NOT NULL,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    experience_years NUMERIC(4, 1),
    education JSONB NOT NULL DEFAULT '[]'::jsonb,
    parsed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resume_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID UNIQUE NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    embedding vector(384) NOT NULL,
    model_version VARCHAR(50) DEFAULT 'all-MiniLM-L6-v2',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fast Approximate Nearest Neighbor (ANN) index for vector cosine similarity
CREATE INDEX idx_resume_embeddings_hnsw 
ON resume_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 2.7 `applications` & `application_status_history`
```sql
CREATE TYPE application_status_enum AS ENUM (
    'APPLIED',
    'SCREENING',
    'SHORTLISTED',
    'INTERVIEW_SCHEDULED',
    'OFFERED',
    'REJECTED',
    'WITHDRAWN'
);

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE RESTRICT,
    status application_status_enum NOT NULL DEFAULT 'APPLIED',
    cover_letter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_status ON applications(status);

CREATE TABLE application_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    old_status application_status_enum,
    new_status application_status_enum NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.8 `match_scores`
```sql
CREATE TABLE match_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    overall_score NUMERIC(5, 2) NOT NULL,
    semantic_score NUMERIC(5, 2) NOT NULL,
    skill_overlap_score NUMERIC(5, 2) NOT NULL,
    matched_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_match_scores_overall ON match_scores(overall_score DESC);
```

### 2.9 `interviews` & `notifications`
```sql
CREATE TYPE interview_status_enum AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    round_name VARCHAR(100) NOT NULL,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_url VARCHAR(500),
    status interview_status_enum NOT NULL DEFAULT 'SCHEDULED',
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```
