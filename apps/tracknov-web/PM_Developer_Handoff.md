# 📘 PM Developer Handoff – Project Assignment & Access System (Tracknov)

## 1. Objective
Enable meaningful user login by implementing a Project Assignment & Access System.

Every login must:
- Join a project
- View assigned projects
- Act based on role (L0–L5)

---

## 2. Core Problem
Users and projects exist, but no binding layer.
Result: Users cannot access or contribute → system unusable.

---

## 3. Project Identity
- project_id (UUID)
- project_code (UNIQUE, human-readable)

Format: TN-{PROJECT}-{001}

---

## 4. Database Design

### Add project_code
ALTER TABLE projects ADD COLUMN project_code TEXT UNIQUE NOT NULL;

### Project membership
CREATE TABLE project_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  role TEXT CHECK (role IN ('L0','L1','L2','L3','L5')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX idx_project_users_user ON project_users(user_id);
CREATE INDEX idx_project_users_project ON project_users(project_id);

---

## 5. API Design

### Invite
POST /api/project/invite
- project_id
- user_email
- role

### Join
POST /api/project/join
- project_code

### Fetch
GET /api/my-projects

---

## 6. RBAC Rules

L5 → L0–L5  
L3 → L0–L2  
Others → none  

---

## 7. UI Requirements
- Join Project (code)
- Invite User modal
- My Projects list

---

## 8. Security
- No access without project_users
- Validate role on every API

---

## 9. Audit
Log: invite, join, role assignment

---

## 10. Workflow Integration

### Access Gate
All actions must validate membership

### Upload
Allowed: L0, L1, L3

### Workflow
DRAFT → READY (L0)
READY → SUBMITTED (L3)
UNDER_REVIEW decisions (L3)
CLARIFICATION → RESUBMITTED (L0)

### Dashboard
Only project_users based data

### Token
Deduct only if membership valid

---

## 11. Acceptance Criteria
- User joins → visible ✔
- Role enforced ✔
- Unauthorized blocked ✔
- No cross-project access ✔

---

## 12. Final Rule
project_users is the single source of truth for access and workflow.
