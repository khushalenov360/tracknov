import os
from django.utils import timezone
from django.conf import settings
from rest_framework import serializers

from accounts.serializers import UserSerializer
from projects.serializers import ProjectSerializer
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by      = UserSerializer(read_only=True)
    validated_by     = UserSerializer(read_only=True)
    project_name     = serializers.CharField(source="project.name", read_only=True)
    file_extension   = serializers.ReadOnlyField()
    file_size_display= serializers.ReadOnlyField()
    validation_status_display = serializers.CharField(
        source="get_validation_status_display", read_only=True
    )
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model  = Document
        fields = [
            "id", "name", "file", "file_extension", "file_size", "file_size_display",
            "project", "project_name",
            "category", "category_display",
            "notes",
            "validation_status", "validation_status_display",
            "rejection_reason",
            "uploaded_by", "validated_by",
            "uploaded_at", "validated_at", "updated_at",
        ]
        read_only_fields = [
            "id", "name", "file_extension", "file_size", "file_size_display",
            "uploaded_by", "validated_by", "uploaded_at", "validated_at", "updated_at",
        ]


class DocumentUploadSerializer(serializers.ModelSerializer):
    """Used for POST (file upload)."""
    file = serializers.FileField()

    class Meta:
        model  = Document
        fields = ["project", "category", "notes", "file"]

    def validate_file(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
            raise serializers.ValidationError(
                f"Unsupported file type '{ext}'. Allowed: "
                + ", ".join(settings.ALLOWED_UPLOAD_EXTENSIONS)
            )
        if value.size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise serializers.ValidationError(
                f"File too large ({value.size / 1024**2:.1f} MB). "
                f"Max allowed: {settings.MAX_UPLOAD_SIZE_MB} MB."
            )
        return value

    def validate_project(self, project):
        user = self.context["request"].user
        if not user.is_enov360_admin:
            if not project.memberships.filter(user=user).exists():
                raise serializers.ValidationError("You are not a member of this project.")
        return project

    def create(self, validated_data):
        file      = validated_data.pop("file")
        document  = Document(
            **validated_data,
            uploaded_by=self.context["request"].user,
            name=file.name,
            file=file,
            file_size=file.size,
        )
        document.save()
        return document


class ValidationActionSerializer(serializers.Serializer):
    action           = serializers.ChoiceField(choices=["approve", "reject"])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data["action"] == "reject" and not data.get("rejection_reason"):
            raise serializers.ValidationError(
                {"rejection_reason": "A reason is required when rejecting a document."}
            )
        return data

    def save(self, document, validated_by):
        if self.validated_data["action"] == "approve":
            document.validation_status = Document.ValidationStatus.VALIDATED
            document.rejection_reason  = ""
        else:
            document.validation_status = Document.ValidationStatus.REJECTED
            document.rejection_reason  = self.validated_data.get("rejection_reason", "")
        document.validated_by = validated_by
        document.validated_at = timezone.now()
        document.save()
        return document
