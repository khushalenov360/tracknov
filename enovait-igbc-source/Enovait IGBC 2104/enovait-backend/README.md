# EnovAIt Backend

Production-ready Django REST API for the EnovAIt Document Management Hub.

## Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Language    | Python 3.12                         |
| Framework   | Django 5 + Django REST Framework    |
| Auth        | JWT via SimpleJWT (rotate + blacklist) |
| Database    | PostgreSQL 16                       |
| File Storage| Local (MEDIA_ROOT) — swap to S3 easily |
| Container   | Docker + Docker Compose             |
| Server      | Gunicorn (prod) / runserver (dev)   |

---

## Project Structure

```
enovait-backend/
├── core/               # Django project config (settings, urls, wsgi)
├── accounts/           # Custom user model, JWT auth, role permissions
│   ├── models.py       # User with 5 roles
│   ├── serializers.py  # Register, login, profile, change-password
│   ├── views.py        # Auth endpoints + admin user management
│   ├── permissions.py  # IsEnov360Admin, CanCreateProject, etc.
│   └── management/commands/seed_demo.py
├── projects/           # Project + team membership
│   ├── models.py       # Project, ProjectMembership
│   ├── serializers.py  # Full project CRUD + member sync
│   └── views.py        # List/create/update/delete + add/remove members
├── documents/          # File upload + validation workflow
│   ├── models.py       # Document (file, category, validation_status)
│   ├── serializers.py  # Upload (validates type/size), ValidationAction
│   └── views.py        # Upload, list/filter, validate/reject, delete
├── Dockerfile          # Multi-stage, non-root user
├── docker-compose.yml  # Postgres + backend
├── requirements.txt
└── .env.example
```

---

## Quick Start (Local)

### 1. Clone and set up environment

```bash
git clone <your-repo>
cd enovait-backend

cp .env.example .env
# Edit .env — set SECRET_KEY, DB_PASSWORD at minimum
```

### 2. Option A — Docker (recommended)

```bash
docker compose up --build
# First run: runs migrations automatically
```

### 3. Option B — Manual (venv)

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Make sure PostgreSQL is running, then:
python manage.py migrate
python manage.py seed_demo      # loads demo users + projects
python manage.py runserver
```

### 4. Create superuser (manual setup only)

```bash
python manage.py createsuperuser
```

---

## Demo Accounts (after seed_demo)

All passwords: **password123**

| Role           | Email                    |
|----------------|--------------------------|
| Enov360 Admin  | admin@enov360.com        |
| Architect      | arch@firm.com            |
| MEP Consultant | mep@consult.com          |
| Contractor     | contractor@build.com     |
| Client         | client@group.com         |

---

## API Reference

Base URL: `http://localhost:8000/api/`

### Auth

| Method | Endpoint                    | Description                        | Auth |
|--------|-----------------------------|------------------------------------|------|
| POST   | `auth/login/`               | Login → access + refresh + user    | No   |
| POST   | `auth/register/`            | Self-register (role = client)      | No   |
| POST   | `auth/logout/`              | Blacklist refresh token            | Yes  |
| POST   | `auth/token/refresh/`       | Get new access token               | No   |
| GET    | `auth/me/`                  | Current user profile               | Yes  |
| PATCH  | `auth/me/`                  | Update own profile                 | Yes  |
| POST   | `auth/change-password/`     | Change password                    | Yes  |
| GET    | `auth/users/`               | List all users (admin only)        | Admin|
| POST   | `auth/users/`               | Create user with any role (admin)  | Admin|
| PATCH  | `auth/users/<id>/`          | Update user (admin)                | Admin|
| DELETE | `auth/users/<id>/`          | Delete user (admin)                | Admin|

#### Login example

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@enov360.com","password":"password123"}'
```

Response:
```json
{
  "access": "<jwt-token>",
  "refresh": "<refresh-token>",
  "user": {
    "id": 1,
    "email": "admin@enov360.com",
    "full_name": "Aryan Shah",
    "role": "admin",
    "role_display": "Enov360 Admin",
    "company": "Enov360",
    "initials": "AS"
  }
}
```

---

### Projects

| Method | Endpoint                              | Description                        | Auth       |
|--------|---------------------------------------|------------------------------------|------------|
| GET    | `projects/`                           | List my projects                   | Yes        |
| POST   | `projects/`                           | Create project                     | Admin/Arch |
| GET    | `projects/<id>/`                      | Project detail                     | Member     |
| PATCH  | `projects/<id>/`                      | Update project                     | Admin/Arch |
| DELETE | `projects/<id>/`                      | Delete project                     | Admin/Arch |
| POST   | `projects/<id>/members/add/`          | Add member `{user_id}`             | Admin      |
| DELETE | `projects/<id>/members/<user_id>/`    | Remove member                      | Admin      |

Query params for GET list: `?status=active`, `?search=godrej`

---

### Documents

| Method | Endpoint                        | Description                            | Auth      |
|--------|---------------------------------|----------------------------------------|-----------|
| GET    | `documents/`                    | List documents (my projects)           | Yes       |
| POST   | `documents/upload/`             | Upload file (multipart/form-data)      | Member    |
| GET    | `documents/pending/`            | Validation queue                       | Admin     |
| GET    | `documents/<id>/`               | Document detail                        | Member    |
| DELETE | `documents/<id>/`               | Delete (uploader or admin)             | Member    |
| POST   | `documents/<id>/validate/`      | Approve or reject                      | Admin     |

#### Upload example

```bash
curl -X POST http://localhost:8000/api/documents/upload/ \
  -H "Authorization: Bearer <token>" \
  -F "project=1" \
  -F "category=arch_drawings" \
  -F "notes=Revision 3" \
  -F "file=@/path/to/plan.pdf"
```

#### Validate example

```bash
curl -X POST http://localhost:8000/api/documents/5/validate/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}'

# or reject:
  -d '{"action": "reject", "rejection_reason": "Missing floor dimensions"}'
```

#### Document filters

```
GET /api/documents/?project=1
GET /api/documents/?validation_status=pending
GET /api/documents/?category=mep_drawings
GET /api/documents/?search=ground+floor
```

---

## Roles & Permissions

| Action                  | Admin | Architect | MEP | Contractor | Client |
|-------------------------|:-----:|:---------:|:---:|:----------:|:------:|
| Create project          | ✅    | ✅        | ❌  | ❌         | ❌     |
| View own projects       | ✅    | ✅        | ✅  | ✅         | ✅     |
| View all projects       | ✅    | ❌        | ❌  | ❌         | ❌     |
| Upload documents        | ✅    | ✅        | ✅  | ✅         | ✅     |
| Delete own documents    | ✅    | ✅        | ✅  | ✅         | ✅     |
| Validate/reject docs    | ✅    | ❌        | ❌  | ❌         | ❌     |
| Add/remove team members | ✅    | ❌        | ❌  | ❌         | ❌     |
| Manage all users        | ✅    | ❌        | ❌  | ❌         | ❌     |

---

## Deployment Checklist

- [ ] Set a strong `SECRET_KEY` in `.env`
- [ ] Set `DEBUG=False`
- [ ] Set `ALLOWED_HOSTS` to your domain
- [ ] Set `CORS_ALLOWED_ORIGINS` to your frontend URL
- [ ] Use a strong `DB_PASSWORD`
- [ ] Run `python manage.py collectstatic`
- [ ] Set up SSL (nginx + certbot or Cloudflare)
- [ ] Consider S3/Cloudflare R2 for `MEDIA_ROOT` in production

---

## Frontend Integration

The backend is designed to pair with a Vite + React frontend.
Store the JWT `access` token in memory (not localStorage).
Use the `refresh` token in an httpOnly cookie or refresh it on 401.

Connect at: `http://localhost:8000` (dev) or your deployed domain.
