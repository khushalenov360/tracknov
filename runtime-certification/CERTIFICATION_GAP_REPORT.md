# CERTIFICATION GAP REPORT

This document outlines any identified limitations, defects, or gaps in the Harita engine observed during Runtime Certification.

## 1. Failed Scenarios
None. All 6 certification scenario groups passed fully.

## 2. Partial Passes
None.

## 3. Missing Data
- **Gap ID**: GAP-001
- **Severity**: LOW
- **Impact**: Some test documents (e.g., `Doc1.pdf`) do not have successfully extracted text (showing `(No extracted text available)`).
- **Recommended Fix**: Ensure the `DocumentParser` correctly extracts raw text from all valid PDF formats, and alert the user early if a document contains no parsable text.

## 4. Missing Ontology Records
- **Gap ID**: GAP-002
- **Severity**: LOW
- **Impact**: The system correctly handles unknown credits by returning "Credit not found" or "Unable to assess". However, if IGBC releases new credits, the system will reject them until the ontology is updated.
- **Recommended Fix**: Implement an ontology auto-sync or manual override interface for administrators.

## 5. Missing Workflow Records
- **Gap ID**: GAP-003
- **Severity**: MEDIUM
- **Impact**: Multi-contributor assignments within a single credit are currently not granular. The `AssignmentReasoner` reports that "This credit does not currently have granular multi-contributor splits."
- **Recommended Fix**: Update the `workflow_document_responsibility` schema to support partial credit ownership.

## 6. Parser Limitations
- **Gap ID**: GAP-004
- **Severity**: LOW
- **Impact**: Hallucination guards currently run a secondary LLM review. This increases latency slightly.
- **Recommended Fix**: Optimize the `SelfReviewEngine` by using a faster, smaller specialized LLM or strict regex-based entity filtering prior to LLM evaluation.

## 7. Grounding Defects
None observed. The system successfully grounds narratives and responses using the extracted text from `project_document` and criteria from the ontology databases. Negative tests confirm that removing evidence properly halts generation.
