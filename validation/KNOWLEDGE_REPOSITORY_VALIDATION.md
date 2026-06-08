# KNOWLEDGE REPOSITORY VALIDATION

### Test KR-001
**Question**: What documents are required for EDA C1?

**Classifier**:
FAILED (Gap ID: GAP-REASONER-01). The Reasoning Engine currently lacks the `QuestionType.KNOWLEDGE_QUERY` classification logic to map conversational questions directly to the `knowledge_credit` tables.

**Database Query** (Simulated execution based on schema):
```sql
SELECT e.name 
FROM credit_evidence_mapping m
JOIN knowledge_evidence_type e ON m.evidence_type_id = e.id
JOIN knowledge_credit c ON m.credit_id = c.id
WHERE c.code = 'EDA C1';
```

**Returned Records**:
```json
[
  { "knowledge_evidence_type": { "name": "DRAWING" } },
  { "knowledge_evidence_type": { "name": "CALCULATION" } },
  { "knowledge_evidence_type": { "name": "AREA_STATEMENT" } },
  { "knowledge_evidence_type": { "name": "NARRATIVE" } }
]
```

**Final Response**:
(Simulated) The required documents for EDA C1 are DRAWING, CALCULATION, AREA_STATEMENT, and NARRATIVE.

---

### Test KR-002
**Question**: What review criteria apply to EDA C1?

**Knowledge Query**:
```sql
SELECT criteria_text 
FROM knowledge_review_criteria r
JOIN knowledge_credit c ON r.credit_id = c.id
WHERE c.code = 'EDA C1';
```

**Returned Review Criteria**:
```json
null
```
*(Note: Review criteria for EDA C1 have not been seeded in the MVP. Only credit structure and evidence maps were seeded.)*

**Final Response**:
(Simulated) No review criteria currently mapped for EDA C1.
