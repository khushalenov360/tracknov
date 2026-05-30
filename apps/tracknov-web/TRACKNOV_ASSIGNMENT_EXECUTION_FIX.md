# TRACKNOV — ASSIGNMENT EXECUTION LIFECYCLE FIX

## TARGET FLOW

Project Admin (L3)
→ Assign submittal/document
→ Click Save
→ Backend validates
→ Assignment persisted
→ Previous assignment deactivated
→ Task created
→ Audit log appended
→ Queue invalidated
→ Assigned user instantly sees task

---

## PATCH 1 — DATABASE

### CREATE TABLE

```sql
CREATE TABLE IF NOT EXISTS submittal_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,

    assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id),

    assigned_by_user_id UUID NOT NULL REFERENCES auth.users(id),

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT unique_active_assignment
    UNIQUE (submittal_id, active)
);
```

---

## PATCH 2 — TASK TABLE

```sql
CREATE TABLE IF NOT EXISTS workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL REFERENCES projects(id),

    submittal_id UUID NOT NULL REFERENCES submittals(id),

    assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id),

    task_type TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## PATCH 3 — REQUIRED SERVER FLOW

```text
BEGIN TRANSACTION

1. Validate auth user
2. Validate project membership
3. Validate actor role == L3
4. Validate target user belongs to project
5. Deactivate previous assignment
6. Create new assignment
7. Create workflow task
8. Append audit log
9. Commit transaction
10. Revalidate queue cache
```

---

## PATCH 4 — FRONTEND SAVE BUTTON

```ts
const onSave = async () => {
   setLoading(true)

   const res = await fetch(
      `/api/submittals/${submittalId}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assigned_to_user_id: selectedUserId
        })
      }
   )

   if (!res.ok) {
      toast.error('Assignment failed')
      return
   }

   toast.success('Assignment updated')

   router.refresh()
}
```

---

## PATCH 5 — PRIORITY TASKS QUERY

```sql
SELECT
    wt.*,
    p.project_name,
    s.name as submittal_name
FROM workflow_tasks wt
JOIN projects p
ON p.id = wt.project_id
JOIN submittals s
ON s.id = wt.submittal_id
WHERE wt.assigned_to_user_id = auth.uid()
AND wt.status = 'PENDING'
ORDER BY wt.created_at DESC;
```

---

## ACCEPTANCE CONDITION

```text
L3 assigns work
→ Save
→ Assigned user instantly receives actionable task
→ Queue updates
→ DB persists
→ Audit logs persist
→ Previous assignment deactivates
→ No manual coordination required
```
