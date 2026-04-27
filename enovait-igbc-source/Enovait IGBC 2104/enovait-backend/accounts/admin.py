from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ("email", "full_name", "role", "company", "is_active", "created_at")
    list_filter   = ("role", "is_active", "is_staff")
    search_fields = ("email", "full_name", "company")
    ordering      = ("full_name",)
    fieldsets = (
        (None,           {"fields": ("email", "password")}),
        ("Profile",      {"fields": ("full_name", "company", "phone")}),
        ("Role & Access",{"fields": ("role", "is_active", "is_staff", "is_superuser")}),
        ("Permissions",  {"fields": ("groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields":  ("email", "full_name", "role", "company", "password1", "password2"),
        }),
    )
