from django.db import models
from django.conf import settings


class Project(models.Model):
    class Status(models.TextChoices):
        ACTIVE    = "active",    "Active"
        ON_HOLD   = "on_hold",   "On Hold"
        COMPLETED = "completed", "Completed"
        ARCHIVED  = "archived",  "Archived"

    class ProjectType(models.TextChoices):
        RESIDENTIAL   = "residential",   "Residential"
        COMMERCIAL    = "commercial",    "Commercial"
        INDUSTRIAL    = "industrial",    "Industrial"
        INFRASTRUCTURE= "infrastructure","Infrastructure"
        MIXED_USE     = "mixed_use",     "Mixed Use"

    name        = models.CharField(max_length=200)
    client      = models.CharField(max_length=150)
    location    = models.CharField(max_length=150, blank=True)
    project_type= models.CharField(max_length=30, choices=ProjectType.choices, default=ProjectType.RESIDENTIAL)
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    description = models.TextField(blank=True)
    progress    = models.PositiveSmallIntegerField(default=0, help_text="0–100 percent")
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_projects",
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def document_count(self):
        return self.documents.count()


class ProjectMembership(models.Model):
    project    = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    added_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="team_additions",
    )
    added_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "user")
        ordering = ["added_at"]

    def __str__(self):
        return f"{self.user.full_name} → {self.project.name}"
