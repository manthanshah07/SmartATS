import hashlib
import os
import re
from celery import shared_task
import numpy as np
from django.db import transaction
from applications.models import (
    Application,
    MatchScore,
    ResumeEmbedding,
    ResumeParsedData,
)
from jobs.models import JobEmbedding

# Core common skills to recognize if spaCy model isn't pre-downloaded
COMMON_TECH_SKILLS = [
    "Python",
    "Django",
    "Flask",
    "FastAPI",
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "PostgreSQL",
    "MySQL",
    "SQLite",
    "Redis",
    "Celery",
    "Docker",
    "Kubernetes",
    "AWS",
    "GCP",
    "Azure",
    "Git",
    "Linux",
    "REST",
    "GraphQL",
    "CI/CD",
    "PyTorch",
    "TensorFlow",
    "Scikit-Learn",
    "Pandas",
    "NumPy",
    "HTML",
    "CSS",
    "Tailwind CSS",
]


def extract_text_from_file(file_path):
    """
    Extracts raw text from a PDF or DOCX resume using PyMuPDF / pdfplumber.
    """
    text = ""
    if not os.path.exists(file_path):
        return text

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        # 1. Try PyMuPDF (fitz)
        try:
            try:
                import pymupdf as fitz
            except ImportError:
                import fitz

            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text() + "\n"
            doc.close()
        except Exception:
            pass

        # 2. Fallback to pdfplumber
        if not text.strip():
            try:
                import pdfplumber

                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text += extracted + "\n"
            except Exception:
                pass
    elif ext in [".docx", ".doc"]:
        try:
            import docx

            doc = docx.Document(file_path)
            text = "\n".join([p.text for p in doc.paragraphs])
        except Exception:
            pass

    # Generic fallback
    if not text.strip():
        try:
            with open(file_path, "r", errors="ignore") as f:
                text = f.read()
        except Exception:
            text = ""

    return text.strip()


def extract_skills_from_text(text, target_skills=None):
    """
    Extracts recognized technical skills using regex matching against
    the job's skills and a technology dictionary.
    """
    text_lower = text.lower()
    found_skills = set()

    candidate_skills = set(COMMON_TECH_SKILLS)
    if target_skills:
        candidate_skills.update(target_skills)

    for skill in candidate_skills:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found_skills.add(skill)

    return sorted(list(found_skills))


def generate_dense_embedding(text, dimensions=384):
    """
    Generates a 384-dimensional dense semantic embedding vector.
    Uses sentence-transformers/all-MiniLM-L6-v2, with fallback to deterministic vector.
    """
    clean_text = text.strip() or "empty document"
    try:
        from sentence_transformers import SentenceTransformer

        # Load sentence transformer model
        model = SentenceTransformer("all-MiniLM-L6-v2")
        vec = model.encode(clean_text, convert_to_numpy=True)
        # Normalize vector
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()
    except Exception:
        # Fallback deterministic pseudo-embedding (384-dim)
        # for offline/testing environments
        seed = int(hashlib.md5(clean_text.encode("utf-8")).hexdigest(), 16) % (2**32)
        rng = np.random.default_rng(seed)
        vec = rng.standard_normal(dimensions)
        vec = vec / np.linalg.norm(vec)
        return vec.tolist()


@shared_task(name="applications.tasks.process_resume_and_match")
def process_resume_and_match(application_id):
    """
    Asynchronous Celery pipeline that extracts text from an uploaded resume,
    performs entity/skill extraction, generates semantic dense embeddings,
    and calculates an explainable match score against the job requisition.
    """
    try:
        application = (
            Application.objects.select_related("job", "resume", "candidate")
            .prefetch_related("job__skills")
            .get(id=application_id)
        )
    except Application.DoesNotExist:
        return f"Application {application_id} not found."

    resume = application.resume
    job = application.job

    # Step A: Text Extraction
    file_path = resume.file.path if resume.file else ""
    extracted_text = extract_text_from_file(file_path)
    if not extracted_text:
        extracted_text = f"Resume for {application.candidate.email}"

    # Step B: Skill Extraction
    job_skills_list = [s.skill_name for s in job.skills.all()]
    extracted_skills = extract_skills_from_text(
        extracted_text, target_skills=job_skills_list
    )

    with transaction.atomic():
        ResumeParsedData.objects.update_or_create(
            resume=resume,
            defaults={
                "extracted_text": extracted_text,
                "skills": extracted_skills,
                "experience_years": None,
                "education": [],
            },
        )

        # Step C: Dense Embedding Generation (384 dimensions)
        resume_vec = generate_dense_embedding(extracted_text, dimensions=384)
        ResumeEmbedding.objects.update_or_create(
            resume=resume,
            defaults={
                "embedding": resume_vec,
                "model_version": "all-MiniLM-L6-v2",
            },
        )

        # Dynamic Job Embedding Generation
        job_full_text = (
            f"{job.title}\n{job.department} {job.location}\n"
            f"{' '.join(job_skills_list)}\n{job.description}"
        )
        job_vec = generate_dense_embedding(job_full_text, dimensions=384)
        JobEmbedding.objects.update_or_create(
            job=job,
            defaults={
                "embedding": job_vec,
                "model_version": "all-MiniLM-L6-v2",
            },
        )

        # Step D: Scoring Computation
        # 1. Semantic Cosine Similarity
        u = np.array(resume_vec, dtype=float)
        v = np.array(job_vec, dtype=float)
        norm_u = np.linalg.norm(u)
        norm_v = np.linalg.norm(v)

        if norm_u > 0 and norm_v > 0:
            cosine_sim = float(np.dot(u, v) / (norm_u * norm_v))
        else:
            cosine_sim = 0.0

        # Cosine mapped to 0-100 range
        semantic_score = max(0.0, min(100.0, (cosine_sim + 1.0) / 2.0 * 100.0))

        # 2. Skill Overlap Ratio
        matched_skills = []
        missing_skills = []
        extracted_skills_lower = [s.lower() for s in extracted_skills]
        text_lower = extracted_text.lower()

        if job_skills_list:
            for skill_name in job_skills_list:
                s_lower = skill_name.lower()
                if s_lower in extracted_skills_lower or s_lower in text_lower:
                    matched_skills.append(skill_name)
                else:
                    missing_skills.append(skill_name)

            overlap_ratio = len(matched_skills) / len(job_skills_list)
        else:
            overlap_ratio = 1.0

        skill_overlap_score = overlap_ratio * 100.0

        # 3. Hybrid formula: 0.65 * semantic + 0.35 * skill_overlap
        overall_score = 0.65 * semantic_score + 0.35 * skill_overlap_score

        # Save MatchScore record
        match_score_obj, _ = MatchScore.objects.update_or_create(
            application=application,
            defaults={
                "overall_score": round(overall_score, 2),
                "semantic_score": round(semantic_score, 2),
                "skill_overlap_score": round(skill_overlap_score, 2),
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
            },
        )

    return f"Processed application {application_id}: Score {overall_score:.2f}%"
