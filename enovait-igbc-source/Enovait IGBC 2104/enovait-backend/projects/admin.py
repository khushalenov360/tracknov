from django.contrib import admin
from .models import Project, ProjectMembership


class MembershipInline(admin.TabularInline):
    model  = ProjectMembership
    extra  = 1
    fields = ("user", "added_by", "added_at")
    readonly_fields = ("added_at",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display  = ("name", "client", "project_type", "status", "progress", "document_count", "created_at")
    list_filter   = ("status", "project_type")
    search_fields = ("name", "client", "location")
    inlines       = [MembershipInline]
    readonly_fields = ("created_by", "created_at", "updated_at")
