# TRACKNOV — TEAM MEMBERSHIP RESOLUTION FIX HANDOFF

## ISSUE SUMMARY
The Team screen under Project Admin shows empty membership data even when users like MEPCON and Contractors are already mapped to the project.

---

## ROOT CAUSE

The Team page currently resolves membership using inconsistent workspace-scoped logic instead of deterministic project membership aggregation.

Current architecture incorrectly mixes:
- global roles
- workspace assumptions
- profile hierarchy
- project membership

The authoritative source MUST be:

```text
project_users
```

---

## AFFECTED FILES

```text
app/team/page.tsx
lib/data.ts
getTeamMembers()
getCurrentUser()
```

---

## CONFIRMED FAILURE

Repo already contains proper project membership logic using:

```ts
getProjectMembers(projectId)
```

However:

```text
Team page is NOT using project-scoped membership resolution.
```

---

# REQUIRED ARCHITECTURE

## SINGLE SOURCE OF TRUTH

ALL Team rendering MUST derive ONLY from:

```text
project_users
```

NOT:
- workspace assumptions
- global_role
- frontend cache
- profile role hierarchy

---

# REQUIRED MEMBERSHIP FLOW

## STEP 1
Fetch current authenticated user.

---

## STEP 2
Fetch accessible projects:

```sql
SELECT project_id
FROM project_users
WHERE user_id = current_user
```

---

## STEP 3
Collect all accessible project_ids.

---

## STEP 4
Fetch all users from:

```sql
project_users
WHERE project_id IN (...)
```

---

## STEP 5
Join profiles table ONLY for display metadata.

---

## STEP 6
Deduplicate users.

---

## STEP 7
Return normalized TeamMember records.

---

# FRONTEND RULES

Frontend MUST:
- hydrate from backend only
- render backend-authoritative state

Frontend MUST NEVER:
- infer membership
- infer permissions
- infer workspace lineage

---

# REQUIRED RESPONSE CONTRACT

Each Team member object MUST contain:

```json
{
  "user_id": "",
  "full_name": "",
  "email": "",
  "role": "",
  "project_ids": [],
  "project_names": [],
  "created_at": "",
  "disabled_at": null
}
```

---

# VALIDATION CHECKLIST

Developer MUST verify:

- MEPCON visible
- Contractor visible
- Multiple projects aggregate correctly
- No duplicate rows
- Refresh-safe rendering
- Login refresh-safe rendering
- RLS-safe visibility
- Empty state only when truly empty

---

# RBAC RULES

Membership visibility MUST be:
- project-scoped
- RBAC-filtered
- backend-authoritative

---

# PRODUCTION BLOCKERS

DO NOT DEPLOY if:
- frontend derives membership
- workspace logic overrides project_users
- RLS blocks legitimate project visibility
- stale cache controls rendering

---

# FINAL GOVERNANCE RULE

Tracknov membership visibility is:

```text
PROJECT MEMBERSHIP DRIVEN
```

NOT:
- workspace inferred
- frontend inferred
- profile inferred
