from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("role", User.Role.ADMIN)
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN     = "admin",      "Enov360 Admin"
        ARCHITECT = "architect",  "Architect"
        MEP       = "mep",        "MEP Consultant"
        CONTRACTOR= "contractor", "Contractor"
        CLIENT    = "client",     "Client"

    email      = models.EmailField(unique=True)
    full_name  = models.CharField(max_length=150)
    company    = models.CharField(max_length=150, blank=True)
    role       = models.CharField(max_length=20, choices=Role.choices, default=Role.CLIENT)
    phone      = models.CharField(max_length=20, blank=True)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["full_name"]
        verbose_name = "User"

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    @property
    def initials(self):
        parts = self.full_name.split()
        return "".join(p[0] for p in parts[:2]).upper()

    # ── Role helpers ────────────────────────────────────────────────────────
    @property
    def is_enov360_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def can_create_project(self):
        return self.role in (self.Role.ADMIN, self.Role.ARCHITECT)

    @property
    def can_validate_document(self):
        return self.role == self.Role.ADMIN

    @property
    def can_manage_team(self):
        return self.role == self.Role.ADMIN
