# RUNTIME TRACE LOGS

## KNOWLEDGE REPOSITORY LOGS
**Timestamp**: 2026-06-03T12:05:00Z
**Question**: What documents are required for EDA C1?
**Classifier**: N/A (Failed classification, fallback triggered)
**Engine**: Harita ReasoningEngine
**Tables Queried**: `credit_evidence_mapping`, `knowledge_evidence_type`, `knowledge_credit` (Simulated in script)
**Rows Returned**: 4 (DRAWING, CALCULATION, AREA_STATEMENT, NARRATIVE)
**Response**: (Simulated via script) The required documents for EDA C1 are DRAWING, CALCULATION, AREA_STATEMENT, and NARRATIVE.

---

## WORKFLOW ONTOLOGY LOGS
**Timestamp**: 2026-06-03T12:05:01Z
**Question**: Who is responsible for EDA C1 drawings?
**Classifier**: N/A (Failed classification, fallback triggered)
**Engine**: Harita ReasoningEngine
**Tables Queried**: `workflow_document_responsibility`, `workflow_role`, `knowledge_evidence_type` (Simulated in script)
**Rows Returned**: 2 (Architect / CREATES, Architect / UPLOADS)
**Response**: (Simulated via script) Architect is responsible for creating and uploading drawings for EDA C1.

---

## END TO END UPLOAD LOGS (Layout.pdf)
**Timestamp**: 2026-06-03T12:05:02Z
**Event**: User Uploads Layout.pdf
**Engine**: DocumentIntelligenceService / AssistantTools (processMockUpload)
**DocumentParser Output**: "Floor plan layout drawing showing architectural design"
**DocumentClassifier Output**: DRAWING
**Ontology Tables Queried**: `knowledge_evidence_type`, `credit_evidence_mapping`, `workflow_document_responsibility`
**Rows Returned**: EDA C1 (Credit), Architect (Role)
**Response**: 
```text
Document Type:
DRAWING

Suggested Credit:
EDA C1

Responsible Contributor:
Architect

Confidence:
95%
```
