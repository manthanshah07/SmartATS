from rest_framework import serializers
from jobs.models import Company, Job, JobSkill


class JobSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobSkill
        fields = ["id", "skill_name", "is_required", "created_at"]
        read_only_fields = ["id", "created_at"]


class CompanySerializer(serializers.ModelSerializer):
    active_jobs_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "slug",
            "website",
            "logo_url",
            "industry",
            "description",
            "is_verified",
            "created_at",
            "active_jobs_count",
        ]
        read_only_fields = ["id", "slug", "created_at", "active_jobs_count"]

    def get_active_jobs_count(self, obj):
        return obj.jobs.filter(is_active=True).count()


class JobSerializer(serializers.ModelSerializer):
    skills = JobSkillSerializer(many=True, required=False)
    company = CompanySerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        source="company",
        write_only=True,
    )
    recruiter_email = serializers.ReadOnlyField(source="recruiter.email")
    recruiter_id = serializers.ReadOnlyField(source="recruiter.id")

    class Meta:
        model = Job
        fields = [
            "id",
            "title",
            "slug",
            "company",
            "company_id",
            "recruiter_id",
            "recruiter_email",
            "department",
            "location",
            "job_type",
            "salary_min",
            "salary_max",
            "description",
            "is_active",
            "skills",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "recruiter_id",
            "recruiter_email",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        # Enforce that only verified companies can have jobs posted
        company = attrs.get("company")
        if company and not company.is_verified:
            raise serializers.ValidationError(
                {
                    "company": (
                        "Cannot post jobs for an unverified company. "
                        "The company must be verified before publishing jobs."
                    )
                }
            )

        # Enforce that salary_min <= salary_max if both provided
        s_min = attrs.get("salary_min")
        s_max = attrs.get("salary_max")
        if s_min is not None and s_max is not None and s_min > s_max:
            raise serializers.ValidationError(
                {"salary_min": "Minimum salary cannot exceed maximum salary."}
            )

        return attrs

    def create(self, validated_data):
        skills_data = validated_data.pop("skills", [])
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["recruiter"] = request.user
            # Associate recruiter profile with company if not yet linked
            if hasattr(request.user, "recruiter_profile"):
                profile = request.user.recruiter_profile
                if not profile.company:
                    profile.company = validated_data["company"]
                    profile.save(update_fields=["company"])

        job = Job.objects.create(**validated_data)

        for skill_item in skills_data:
            JobSkill.objects.create(
                job=job,
                skill_name=skill_item["skill_name"],
                is_required=skill_item.get("is_required", True),
            )

        return job

    def update(self, instance, validated_data):
        skills_data = validated_data.pop("skills", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if skills_data is not None:
            instance.skills.all().delete()
            for skill_item in skills_data:
                JobSkill.objects.create(
                    job=instance,
                    skill_name=skill_item["skill_name"],
                    is_required=skill_item.get("is_required", True),
                )

        return instance
