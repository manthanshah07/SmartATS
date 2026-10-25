from django.core.exceptions import ValidationError
from django.db import transaction
from applications.models import Application, ApplicationStatusHistory


class ApplicationStateMachine:
    """
    State machine service governing candidate application lifecycle transitions.
    Enforces deterministic state transitions and prevents illegal stage leaps.
    """

    VALID_TRANSITIONS = {
        Application.Status.APPLIED: {
            Application.Status.SCREENING,
            Application.Status.REJECTED,
            Application.Status.WITHDRAWN,
        },
        Application.Status.SCREENING: {
            Application.Status.SHORTLISTED,
            Application.Status.REJECTED,
            Application.Status.WITHDRAWN,
        },
        Application.Status.SHORTLISTED: {
            Application.Status.INTERVIEW_SCHEDULED,
            Application.Status.REJECTED,
            Application.Status.WITHDRAWN,
        },
        Application.Status.INTERVIEW_SCHEDULED: {
            Application.Status.OFFERED,
            Application.Status.REJECTED,
            Application.Status.WITHDRAWN,
        },
        Application.Status.OFFERED: {
            Application.Status.HIRED,
            Application.Status.REJECTED,
            Application.Status.WITHDRAWN,
        },
        Application.Status.REJECTED: set(),
        Application.Status.WITHDRAWN: set(),
        Application.Status.HIRED: set(),
    }

    TERMINAL_STATES = {
        Application.Status.REJECTED,
        Application.Status.WITHDRAWN,
        Application.Status.HIRED,
    }

    @classmethod
    def can_transition(cls, current_status, target_status):
        """Checks if a transition from current_status to target_status is valid."""
        if current_status == target_status:
            return True
        allowed = cls.VALID_TRANSITIONS.get(current_status, set())
        return target_status in allowed

    @classmethod
    def validate_transition(cls, current_status, target_status):
        """
        Validates transition and raises a ValidationError if invalid.
        """
        if current_status == target_status:
            return

        if current_status in cls.TERMINAL_STATES:
            raise ValidationError(
                f"Application is in terminal state '{current_status}' "
                f"and cannot be transitioned to '{target_status}'."
            )

        allowed = cls.VALID_TRANSITIONS.get(current_status, set())
        if target_status not in allowed:
            allowed_str = ", ".join(sorted(allowed)) if allowed else "none"
            raise ValidationError(
                f"Illegal state transition from '{current_status}' "
                f"to '{target_status}'. "
                f"Allowed target states: [{allowed_str}]."
            )

    @classmethod
    @transaction.atomic
    def transition(cls, application, new_status, changed_by=None, notes=""):
        """
        Executes a validated state transition, saves the application,
        and logs an immutable ApplicationStatusHistory audit record.
        """
        old_status = application.status
        cls.validate_transition(old_status, new_status)

        if old_status != new_status:
            application.status = new_status
            application.save(update_fields=["status", "updated_at"])

            ApplicationStatusHistory.objects.create(
                application=application,
                changed_by=changed_by,
                old_status=old_status,
                new_status=new_status,
                notes=notes,
            )

        return application
