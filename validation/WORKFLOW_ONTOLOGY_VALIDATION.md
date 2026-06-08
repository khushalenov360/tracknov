# WORKFLOW ONTOLOGY VALIDATION

### Test WO-001
**Question**: Who is responsible for EDA C1 drawings?

**Workflow Query**:
```sql
SELECT r.name, w.action
FROM workflow_document_responsibility w
JOIN workflow_role r ON w.role_id = r.id
JOIN knowledge_evidence_type e ON w.evidence_type_id = e.id
WHERE e.name = 'DRAWING';
```

**Returned Role**:
```json
[
  {
    "action": "CREATES",
    "workflow_role": {
      "name": "Architect"
    }
  },
  {
    "action": "UPLOADS",
    "workflow_role": {
      "name": "Architect"
    }
  }
]
```

**Final Response**:
(Simulated) Architect is responsible for creating and uploading DRAWING evidence.

---

### Test WO-002
**Question**: Who uploads calculations for EDA C1?

**Workflow Query**:
```sql
SELECT r.name, w.action
FROM workflow_document_responsibility w
JOIN workflow_role r ON w.role_id = r.id
JOIN knowledge_evidence_type e ON w.evidence_type_id = e.id
WHERE e.name = 'CALCULATION' AND w.action = 'UPLOADS';
```

**Role Returned**:
*(Simulated run currently returns null because specific mapping for 'CALCULATION' was not fully seeded for a specific role in today's rapid MVP. Seed fallback caught the lack of records).*

**Final Response**:
(Simulated) No responsible role mapped for uploading CALCULATION currently.

---

### Test WO-003
**Question**: Which documents is Architect responsible for?

**Workflow Query**:
```sql
SELECT e.name 
FROM workflow_document_responsibility w
JOIN knowledge_evidence_type e ON w.evidence_type_id = e.id
JOIN workflow_role r ON w.role_id = r.id
WHERE r.name = 'Architect';
```

**Document List**:
```json
[
  { "knowledge_evidence_type": { "name": "DRAWING" } },
  { "knowledge_evidence_type": { "name": "DRAWING" } }
]
```
*(One record for CREATES, one for UPLOADS)*

**Final Response**:
(Simulated) Architect is responsible for DRAWING evidence.
