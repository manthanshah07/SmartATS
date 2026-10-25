from rest_framework import permissions
from accounts.models import User


class IsRecruiterOrReadOnly(permissions.BasePermission):
    """
    Allows read-only access to any user (candidates and public),
    but restricts write access strictly to recruiters and admins.
    """

    message = "Only recruiters are authorized to create or modify jobs."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role == User.Role.RECRUITER
                or request.user.role == User.Role.ADMIN
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


class IsJobOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission allowing only the recruiter who posted
    the job (or an admin) to update or delete it.
    """

    message = "You can only update or delete job postings you originally created."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                obj.recruiter == request.user
                or request.user.role == User.Role.ADMIN
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


class IsCompanyManagerOrAdmin(permissions.BasePermission):
    """
    Object-level permission allowing company recruiters or admins
    to modify company information.
    """

    message = "You are not authorized to update this company's profile."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role == User.Role.ADMIN or user.is_staff or user.is_superuser:
            return True
        if hasattr(user, "recruiter_profile"):
            return user.recruiter_profile.company == obj
        return False
