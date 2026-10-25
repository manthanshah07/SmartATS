# Application Flow & Architectural Workflows — SmartATS

## 1. System Topology Overview

```
                      ┌───────────────────────────────┐
                      │          Web Browser          │
                      │   (Candidate / Recruiter UI)  │
                      └───────────────┬───────────────┘
                                      │ HTTPS / REST (JSON)
                                      ▼
                      ┌───────────────────────────────┐
                      │    Django REST API Gateway    │
                      │  (SimpleJWT / RBAC Middleware) │
                      └───────┬───────────────┬───────┘
                              │               │
       Direct DB Reads/Writes │               │ Task Dispatch (JSON)
                              ▼               ▼
           ┌───────────────────────┐     ┌───────────────────────┐
           │   PostgreSQL 16 DB    │     │   Redis Message Queue │
           │     + pgvector        │     │    (Celery Broker)    │
           └───────────────────────┘     └───────────┬───────────┘
                      ▲                              │
                      │ Read / Write Results         │ Task Consumption
                      │                              ▼
                      │                  ┌───────────────────────┐
                      └──────────────────┤  Celery Async Worker  │
                                         │ (PyMuPDF + spaCy +    │
                                         │  SentenceTransformer) │
                                         └───────────────────────┘
```

---

## 2. Core User Workflows

### 2.1 Workflow 1: Candidate Job Application & Resume Processing
This workflow illustrates how a candidate submits a resume and how the system processes it asynchronously without freezing the web application.

```
Candidate               Frontend SPA             Django API Server             Redis / Celery Worker           PostgreSQL
    │                        │                           │                               │                         │
    │── 1. Selects Job & ───►│                           │                               │                         │
    │   Uploads Resume (PDF) │                           │                               │                         │
    │                        │── 2. POST /applications ─►│                               │                         │
    │                        │   (Multipart Form-Data)   │                               │                         │
    │                        │                           │── 3. Validate & Save File ───►│                         │
    │                        │                           │   (Status: 'APPLIED')         │                         │── 4. Insert Record
    │                        │                           │                               │                         │   (App & Resume)
    │                        │                           │── 5. Enqueue Task ───────────►│                         │
    │                        │                           │   process_resume(app_id)      │                         │
    │                        │◄─ 6. HTTP 201 Created ────│                               │                         │
    │                        │   (Application Received)  │                               │                         │
    │◄── 7. UI Shows Pending │                           │                               │                         │
    │    Processing State    │                           │                               │                         │
    │                        │                           │                               │── 8. Worker Picks Up ──►│
    │                        │                           │                               │   Task from Queue       │
    │                        │                           │                               │                         │
    │                        │                           │                               │── 9. Extract Text ─────►│
    │                        │                           │                               │   (PyMuPDF / pdfplumber)│
    │                        │                           │                               │                         │
    │                        │                           │                               │── 10. Extract Entities ─►
    │                        │                           │                               │   (spaCy NER: Skills)   │
    │                        │                           │                               │                         │
    │                        │                           │                               │── 11. Generate Vector ──►
    │                        │                           │                               │   (all-MiniLM-L6-v2)    │
    │                        │                           │                               │                         │
    │                        │                           │                               │── 12. Calculate Match ──►
    │                        │                           │                               │   & Skill Gap Matrix    │
    │                        │                           │                               │                         │
    │                        │                           │                               │── 13. Save Score & ────►│ (MatchScore,
    │                        │                           │                               │   Vector to DB          │  ResumeEmbedding)
    │                        │                           │                               │                         │
    │                        │── 14. Poll / Stream ─────►│                               │                         │
    │                        │   GET /applications/{id}  │── 15. Query Score & Status ────────────────────────────►│
    │                        │◄─ 16. Returns Match Score │                                                         │
    │◄── 17. Displays Match  │   & Skill Gap Breakdown   │                                                         │
    │    Insights & Score    │                           │                                                         │
```

---

### 2.2 Workflow 2: Recruiter Candidate Review & State Transition
Recruiters review candidates ranked by semantic match score and move them through the hiring pipeline.

```
Recruiter              Frontend SPA              Django API Server                     PostgreSQL
    │                       │                            │                                  │
    │── 1. Open Job ───────►│                            │                                  │
    │   Pipeline Dashboard  │                            │                                  │
    │                       │── 2. GET /jobs/{id}/apps ─►│                                  │
    │                       │      ?ordering=-match_score│── 3. Query Applications Sorted ─►│
    │                       │                            │      by AI Match Score           │
    │                       │◄─ 4. Return Candidate List ┼──────────────────────────────────┘
    │                       │      with Score & Badges   │
    │◄── 5. Renders Ranked ─│                            │
    │    Kanban Board       │                            │
    │                       │                            │
    │── 6. Drag Candidate ─►│                            │
    │    to 'INTERVIEW'     │── 7. PATCH /applications/id│
    │                       │      { "status":           │
    │                       │        "INTERVIEW_SCHED" } │── 8. Check Allowed Transitions ──┐
    │                       │                            │   (Validate State Machine)       │
    │                       │                            │                                  │ Valid
    │                       │                            │── 9. Update Application Status ─►│
    │                       │                            │                                  │
    │                       │                            │── 10. Insert Audit Record ──────►│
    │                       │                            │    in `application_status_history`│
    │                       │                            │                                  │
    │                       │                            │── 11. Trigger Notification ─────►│
    │                       │                            │    to Candidate                  │
    │                       │◄─ 12. HTTP 200 OK ─────────┤                                  │
    │◄── 13. Updates UI ────│                            │                                  │
```

---

## 3. Formal Application Lifecycle State Machine

The following diagram defines the valid and invalid lifecycle states for every job application:

```
                   ┌──────────────┐
                   │   APPLIED    │
                   └──────┬───────┘
                          │ (Recruiter screens resume)
                          ▼
                   ┌──────────────┐
                   │  SCREENING   │
                   └──────┬───────┘
                          │
             ┌────────────┴────────────┐
             │ (Meets criteria)        │ (Fails criteria)
             ▼                         ▼
      ┌──────────────┐          ┌──────────────┐
      │ SHORTLISTED  │          │   REJECTED   │◄─────────┐
      └──────┬───────┘          └──────────────┘          │
             │                                            │
             │ (Schedule interview)                       │ (Rejected at
             ▼                                            │  any stage)
┌───────────────────────────┐                             │
│    INTERVIEW_SCHEDULED    ├─────────────────────────────┤
└────────────┬──────────────┘                             │
             │                                            │
             │ (Passed all rounds)                        │
             ▼                                            │
      ┌──────────────┐                                    │
      │   OFFERED    ├────────────────────────────────────┘
      └──────┬───────┘
             │
             │ (Candidate accepts)
             ▼
      ┌──────────────┐
      │    HIRED     │
      └──────────────┘

* Note: Candidates may transition an application to WITHDRAWN from any non-final state.
```
