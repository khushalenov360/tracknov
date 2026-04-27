import os
from django.db import models
from django.conf import settings
from projects.models import Project


def document_upload_path(instance, filename):
    """Upload to: media/projects/<project_id>/documents/<filename>"""
    return f"projects/{instance.project_id}/documents/{filename}"


class Document(models.Model):
    class ValidationStatus(models.TextChoices):
        PENDING   = "pending",   "Pending Review"
        VALIDATED = "validated", "Validated"
        REJECTED  = "rejected",  "Rejected"

    class Category(models.TextChoices):
        ARCH_DRAWINGS  = "arch_drawings",  "Architectural Drawings"
        STRUCT_DRAWINGS= "struct_drawings","Structural Drawings"
        MEP_DRAWINGS   = "mep_drawings",   "MEP Drawings"
        BOQ            = "boq",            "BOQ / Estimates"
        CONTRACTS      = "contracts",      "Contracts"
        PERMITS        = "permits",        "Permits & Approvals"
        SITE_REPORTS   = "site_reports",   "Site Reports"
        OTHER          = "other",          "Other"

    project         = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="documents")
    uploaded_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_documents",
    )
    validated_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="validated_documents",
    )
    name            = models.CharField(max_length=255, help_text="Original filename")
    file            = models.FileField(upload_to=document_upload_path)
    category        = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    notes           = models.TextField(blank=True)
    file_size       = models.PositiveIntegerField(default=0, help_text="Bytes")
    validation_status = models.CharField(
        max_length=20, choices=ValidationStatus.choices, default=ValidationStatus.PENDING
    )
    rejection_reason  = models.TextField(blank=True)
    uploaded_at       = models.DateTimeField(auto_now_add=True)
    validated_at      = models.DateTimeField(null=True, blank=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.name

    @property
    def file_extension(self):
        _, ext = os.path.splitext(self.name)
        return ext.lower().lstrip(".")

    @property
    def file_size_display(self):
        if self.file_size < 1024:
            return f"{self.file_size} B"
        elif self.file_size < 1024 ** 2:
            return f"{self.file_size / 1024:.1f} KB"
        else:
            return f"{self.file_size / 1024 ** 2:.1f} MB"
