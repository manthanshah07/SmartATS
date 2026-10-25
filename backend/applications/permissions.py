from rest_framework import permissions
from accounts.models import User


class CanAccessApplication(permissions.BasePermission):
    """
    Permission allowing:
    - Candidate who applied to view or withdraw their application.
    - Recruiter associated with the company of the applied job to
      view and manage stages.
    - Platform administrators full access.
    """

    message = "You do not have permission to view or modify this application."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Admins have full access
        if user.role == User.Role.ADMIN or user.is_staff or user.is_superuser:
            return True

        # Candidate who submitted the application
        if user.role == User.Role.CANDIDATE:
            return obj.candidate == user

        # Recruiter whose company or user owns the job
        if user.role == User.Role.RECRUITER:
            if obj.job.recruiter == user:
                return True
            if hasattr(user, "recruiter_profile") and user.recruiter_profile.company:
                return obj.job.company == user.recruiter_profile.company

        return False
