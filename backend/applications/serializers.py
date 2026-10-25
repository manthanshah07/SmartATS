import os
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from accounts.models import User
from applications.models import (
    Application,
    ApplicationStatusHistory,
    MatchScore,
    Resume,
)
from applications.services import ApplicationStateMachine
from jobs.models import Job
from jobs.serializers import JobSerializer

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream",  # Fallback for some clients, checked with extension
}
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


class ResumeSerializer(serializers.ModelSerializer):
    candidate_email = serializers.ReadOnlyField(source="candidate.email")

    class Meta:
        model = Resume
        fields = [
            "id",
            "candidate_email",
            "file",
            "original_filename",
            "file_size",
            "mime_type",
            "uploaded_at",
        ]
        read_only_fields = [
            "id",
            "candidate_email",
            "original_filename",
            "file_size",
            "mime_type",
            "uploaded_at",
        ]

    def validate_file(self, file_obj):
        # 1. Validate file size (max 5MB)
        if file_obj.size > MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f"File size exceeds 5MB limit. Uploaded file is "
                f"{file_obj.size / (1024 * 1024):.2f}MB."
            )

        # 2. Validate file extension
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"Unsupported file format '{ext}'. "
                "Allowed formats: PDF (.pdf), DOCX (.docx)."
            )

        # 3. Validate content type / mime type
        content_type = getattr(file_obj, "content_type", "")
        if content_type and content_type not in ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                f"Unsupported MIME type '{content_type}'. Must be PDF or DOCX."
            )

        # 4. Validate file header magic bytes
        try:
            file_obj.seek(0)
            header = file_obj.read(8)
            file_obj.seek(0)
        except Exception:
            raise serializers.ValidationError("Unable to inspect uploaded file header.")

        if ext == ".pdf" and not header.startswith(b"%PDF-"):
            raise serializers.ValidationError(
                "Invalid PDF file: file signature does not match PDF specification."
            )
        elif ext == ".docx" and not header.startswith(b"PK\x03\x04"):
            raise serializers.ValidationError(
                "Invalid DOCX file: file signature does not match "
                "Office Open XML specification."
            )

        return file_obj

    def create(self, validated_data):
        file_obj = validated_data["file"]
        user = self.context["request"].user

        docx_mime = (
            "application/vnd.openxmlformats-officedocument." "wordprocessingml.document"
        )
        ext = os.path.splitext(file_obj.name)[1].lower()
        mime_type = getattr(file_obj, "content_type", "")
        if not mime_type or mime_type == "application/octet-stream":
            mime_type = "application/pdf" if ext == ".pdf" else docx_mime

        resume = Resume.objects.create(
            candidate=user,
            file=file_obj,
            original_filename=file_obj.name,
            file_size=file_obj.size,
            mime_type=mime_type,
        )
        return resume


class ApplicationStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.ReadOnlyField(source="changed_by.email")

    class Meta:
        model = ApplicationStatusHistory
        fields = [
            "id",
            "changed_by_email",
            "old_status",
            "new_status",
            "notes",
            "created_at",
        ]
        read_only_fields = fields


class MatchScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchScore
        fields = [
            "id",
            "overall_score",
            "semantic_score",
            "skill_overlap_score",
            "matched_skills",
            "missing_skills",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ApplicationSerializer(serializers.ModelSerializer):
    job = JobSerializer(read_only=True)
    job_id = serializers.PrimaryKeyRelatedField(
        queryset=Job.objects.filter(is_active=True),
        source="job",
        write_only=True,
    )
    resume = ResumeSerializer(read_only=True)
    resume_id = serializers.PrimaryKeyRelatedField(
        queryset=Resume.objects.all(),
        source="resume",
        write_only=True,
    )
    candidate_email = serializers.ReadOnlyField(source="candidate.email")
    candidate_id = serializers.ReadOnlyField(source="candidate.id")
    status_history = ApplicationStatusHistorySerializer(many=True, read_only=True)
    match_score = MatchScoreSerializer(read_only=True)
    notes = serializers.CharField(
        write_only=True, required=False, allow_blank=True, default=""
    )

    class Meta:
        model = Application
        fields = [
            "id",
            "job",
            "job_id",
            "candidate_id",
            "candidate_email",
            "resume",
            "resume_id",
            "status",
            "cover_letter",
            "match_score",
            "status_history",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "candidate_id",
            "candidate_email",
            "match_score",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None

        # On Creation
        if not self.instance:
            resume = attrs.get("resume")
            if user and resume and resume.candidate != user:
                raise serializers.ValidationError(
                    {"resume_id": "You can only submit your own resume."}
                )

            job = attrs.get("job")
            if (
                user
                and job
                and Application.objects.filter(job=job, candidate=user).exists()
            ):
                raise serializers.ValidationError(
                    {"job_id": "You have already applied for this job opening."}
                )

        # On Status Update
        new_status = attrs.get("status")
        if self.instance and new_status and new_status != self.instance.status:
            # Check candidate withdrawal restriction
            if (
                user
                and user.role == User.Role.CANDIDATE
                and new_status != Application.Status.WITHDRAWN
            ):
                raise serializers.ValidationError(
                    {
                        "status": (
                            "Candidates are only permitted to withdraw "
                            "their application."
                        )
                    }
                )

            try:
                ApplicationStateMachine.validate_transition(
                    self.instance.status, new_status
                )
            except DjangoValidationError as e:
                raise serializers.ValidationError({"status": str(e.message)})

        return attrs

    def create(self, validated_data):
        notes = validated_data.pop("notes", "")
        request = self.context.get("request")
        user = request.user

        validated_data["candidate"] = user
        validated_data["status"] = Application.Status.APPLIED

        application = Application.objects.create(**validated_data)

        # Initial audit history log
        ApplicationStatusHistory.objects.create(
            application=application,
            changed_by=user,
            old_status=None,
            new_status=Application.Status.APPLIED,
            notes=notes or "Application submitted.",
        )

        # Trigger asynchronous AI matching and resume parsing pipeline
        from applications.tasks import process_resume_and_match

        process_resume_and_match.delay(str(application.id))

        return application

    def update(self, instance, validated_data):
        notes = validated_data.pop("notes", "")
        new_status = validated_data.pop("status", None)
        request = self.context.get("request")
        user = request.user if request else None

        # Update other fields (like cover_letter) if present
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Execute state machine transition if status changed
        if new_status and new_status != instance.status:
            ApplicationStateMachine.transition(
                application=instance,
                new_status=new_status,
                changed_by=user,
                notes=notes,
            )

        return instance
