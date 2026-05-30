from django.core.management.base import BaseCommand
from accounts.models import User
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Seed the database with demo users and projects"

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")
        users = {}
        specs = [
            ("admin@enov360.com",    "Aryan Shah",   "admin",      "Enov360"),
            ("arch@firm.com",        "Priya Mehta",  "architect",  "Mehta Architects"),
            ("mep@consult.com",      "Rohan Verma",  "mep",        "Verma MEP"),
            ("contractor@build.com", "Suresh Kumar", "contractor", "Kumar Builders"),
            ("client@group.com",     "Nisha Patel",  "client",     "Patel Group"),
        ]
        for email, name, role, company in specs:
            u, created = User.objects.get_or_create(email=email, defaults=dict(full_name=name, role=role, company=company))
            if created:
                u.set_password("password123")
                u.save()
            users[email] = u

        admin_user = users["admin@enov360.com"]
        project_data = [
            ("Godrej Residency Block C", "Godrej Properties", "Mumbai, MH", "residential", "active", 65,
             ["admin@enov360.com","arch@firm.com","mep@consult.com","contractor@build.com"]),
            ("Hiranandani IT Park Phase 2", "Hiranandani Group", "Thane, MH", "commercial", "active", 40,
             ["admin@enov360.com","arch@firm.com","client@group.com"]),
            ("Adani Solar Warehouse", "Adani Group", "Pune, MH", "industrial", "active", 20,
             ["admin@enov360.com","mep@consult.com"]),
        ]
        for name, client, loc, ptype, pstatus, prog, members in project_data:
            p, _ = Project.objects.get_or_create(name=name, defaults=dict(
                client=client, location=loc, project_type=ptype,
                status=pstatus, progress=prog, created_by=admin_user))
            for email in members:
                ProjectMembership.objects.get_or_create(project=p, user=users[email], defaults={"added_by": admin_user})

        self.stdout.write(self.style.SUCCESS("Done. All passwords: password123"))
