# Users DeveloperHandoff.md

## 1. Objective
Define and implement the Users module for Tracknov, supporting all roles (L0–L5) with strict role-based access control, secure authentication, and seamless user experience.

The system must ensure:
- Role-based visibility and actions
- Secure authentication with minimal friction
- Scalability across multiple clients and projects
- Clear mapping of users to projects and roles

---

## 2. User Roles

### L0 – Execution Users
- MEP Consultant
- Architect
- Contractor

### L1 – Project Owner
- Reviews and approves documents

### L2 – Client
- Views dashboards and reports

### L3 – Project Admin
- Validates documents and manages submission

### L5 – Super User
- Platform owner with full control

---

## 3. Core Functional Requirements

### 3.1 User Creation & Management
- Create user with:
  - Name
  - Email / Phone
  - Role
  - Assigned project(s)

- Ability to:
  - Edit user details
  - Deactivate user
  - Reassign roles

Expected Outcome:
- Flexible and scalable user management

---

### 3.2 Role-Based Access Control (RBAC)
- Each role sees only relevant data

Rules:
- L0 → Only assigned credits/tasks
- L1 → Review queue + project dashboard
- L2 → Executive dashboard only
- L3 → Validation + submission tools
- L5 → Full system access

Expected Outcome:
- No data leakage
- Clean user experience

---

### 3.3 Authentication System
Supported methods:
- Magic link (email)
- OTP (phone)
- Google login (optional)

Rules:
- No mandatory password system
- Session persistence

Expected Outcome:
- High adoption
- Low login friction

---

### 3.4 Project Mapping
- Users can belong to:
  - Multiple projects
  - Multiple roles (future-ready)

Expected Outcome:
- Flexibility in real-world scenarios

---

### 3.5 Access Isolation
- Users cannot:
  - View other clients’ data
  - Access unauthorized projects

Expected Outcome:
- Data security and compliance

---

### 3.6 Activity Tracking
Track:
- Login history
- Actions performed
- Last active timestamp

Expected Outcome:
- Auditability
- Usage insights

---

### 3.7 Invitation System
- Send invite link via email/WhatsApp
- One-click onboarding
- Auto-assign role + project

Expected Outcome:
- Fast onboarding
- No manual setup

---

## 4. UX Guidelines
- Simple onboarding (1-step login)
- No password memory required
- Role-based dashboard on login
- Clear profile + role visibility

---

## 5. Backend Requirements

### Core Table: users

Fields:
- id
- name
- email
- phone
- role
- client_id
- status (active/inactive)
- created_at
- last_login

---

### Mapping Table: user_projects

Fields:
- user_id
- project_id
- role

---

### Session Table (optional)
- session_id
- user_id
- token
- expiry

---

## 6. APIs

- POST /users/create
- GET /users
- PUT /users/update
- POST /auth/login
- POST /auth/otp
- GET /auth/session
- POST /users/invite

---

## 7. Security Requirements
- JWT-based authentication
- Role-based authorization middleware
- Data isolation per client
- Encrypted sensitive data

---

## 8. Testing Criteria

### Functional
- User creation and role assignment works
- Role-based views enforced
- Authentication flows work correctly

### Performance
- Login <2 sec
- API response <1 sec

### User Acceptance
- User logs in without confusion
- No unauthorized access possible

---

## 9. Success Metrics

- Login success rate >95%
- Onboarding time <2 minutes
- Zero unauthorized access incidents

---

## 10. Final Outcome

The Users module should:
- Enable seamless onboarding
- Enforce strict access control
- Provide frictionless login experience
- Support scalable multi-client operations

---

## Final Principle

If users face friction during login or see irrelevant data, the system has failed.
