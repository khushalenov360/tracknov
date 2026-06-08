# EVIDENCE ONTOLOGY VALIDATION

### Test EO-001
**Question**: What evidence types are valid for EDA C1?

**Ontology Query** (Simulated execution based on schema):
```sql
SELECT e.name 
FROM credit_evidence_mapping m
JOIN knowledge_evidence_type e ON m.evidence_type_id = e.id
JOIN knowledge_credit c ON m.credit_id = c.id
WHERE c.code = 'EDA C1';
```

**Returned Evidence Types**:
```json
[
  { "knowledge_evidence_type": { "name": "DRAWING" } },
  { "knowledge_evidence_type": { "name": "CALCULATION" } },
  { "knowledge_evidence_type": { "name": "AREA_STATEMENT" } },
  { "knowledge_evidence_type": { "name": "NARRATIVE" } }
]
```

**Final Response**:
(Simulated) The evidence types valid for EDA C1 are DRAWING, CALCULATION, AREA_STATEMENT, and NARRATIVE.

---

### Test EO-002
**Question**: Which credits use DRAWING evidence?

**Ontology Query**:
```sql
SELECT c.code 
FROM credit_evidence_mapping m
JOIN knowledge_credit c ON m.credit_id = c.id
JOIN knowledge_evidence_type e ON m.evidence_type_id = e.id
WHERE e.name = 'DRAWING';
```

**Credits Returned**:
```json
[
  {
    "knowledge_credit": {
      "code": "EDA C1"
    }
  }
]
```

**Final Response**:
(Simulated) The credit EDA C1 uses DRAWING evidence.
