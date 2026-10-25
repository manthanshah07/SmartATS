from django.db.models.signals import post_save
from django.dispatch import receiver
from accounts.models import CandidateProfile, RecruiterProfile, User


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        if instance.role == User.Role.CANDIDATE:
            CandidateProfile.objects.get_or_create(
                user=instance,
                defaults={
                    "first_name": instance.first_name or "",
                    "last_name": instance.last_name or "",
                },
            )
        elif instance.role == User.Role.RECRUITER:
            RecruiterProfile.objects.get_or_create(user=instance)
