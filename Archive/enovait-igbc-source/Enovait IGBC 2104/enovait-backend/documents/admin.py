from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display  = (
        "name", "project", "category", "validation_status",
        "uploaded_by", "file_size_display", "uploaded_at",
    )
    list_filter   = ("validation_status", "category", "project")
    search_fields = ("name", "notes", "project__name", "uploaded_by__full_name")
    readonly_fields = (
        "uploaded_by", "validated_by", "uploaded_at",
        "validated_at", "file_size", "file_extension",
    )
    fieldsets = (
        ("File",       {"fields": ("name", "file", "file_size", "file_extension")}),
        ("Metadata",   {"fields": ("project", "category", "notes")}),
        ("Validation", {"fields": ("validation_status", "rejection_reason", "validated_by", "validated_at")}),
        ("Audit",      {"fields": ("uploaded_by", "uploaded_at")}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)
