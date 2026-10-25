from rest_framework import permissions
from accounts.models import User


class IsCandidate(permissions.BasePermission):
    """
    Allows access only to authenticated users with the CANDIDATE role.
    """

    message = "Access restricted to candidate users only."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.CANDIDATE
        )


class IsRecruiter(permissions.BasePermission):
    """
    Allows access only to authenticated users with the RECRUITER role.
    """

    message = "Access restricted to recruiter users only."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.RECRUITER
        )


class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to admin users (role ADMIN, is_staff, or is_superuser).
    """

    message = "Access restricted to administrator users only."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role == User.Role.ADMIN
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to allow read-only access for safe HTTP methods,
    and restrict write permissions strictly to the owner of the object.
    """

    message = "You do not have permission to modify this resource."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if hasattr(obj, "user"):
            return obj.user == request.user
        if hasattr(obj, "owner"):
            return obj.owner == request.user
        return obj == request.user
