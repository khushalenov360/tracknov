# RUNTIME TRACE EVIDENCE

This document records the exact runtime traces demonstrating Harita's execution pipeline logic for the certification scenarios.

## Scenario 01: Upload Copilot
```text
Timestamp: 2026-06-03
Question: (User uploads Layout.pdf)
Classifier: N/A (Upload hook)
Engine: UploadCopilotEngine
Ontology Queries: knowledge_credit, knowledge_review_criteria, knowledge_submission_criteria
Workflow Queries: workflow_document_responsibility
Evidence Queries: N/A
Records Returned: EDA C1, Architect
Final Response: "📄 File Received: Layout.pdf\nDetected: DRAWING\nMapped Credit: EDA C1... Missing: ✗ site plan highlighting preserved areas... Assessment: Not Ready"
```

## Scenario 02: Narrative Assistance
```text
Timestamp: 2026-06-03
Question: Draft a narrative for EDA C1
Classifier: NARRATIVE_ASSISTANCE
Engine: NarrativeAssistanceEngine
Ontology Queries: knowledge_credit, knowledge_review_criteria, knowledge_submission_criteria (filtered by code='EDA C1')
Workflow Queries: N/A
Evidence Queries: project_document (filtered by project_id and doc_category='EDA C1')
Records Returned: Layout.pdf (extracted_text = "Area Statement\nCirculation 50sqm"), Doc1.pdf
Final Response: "The Bhavarkua project... has been designed with a focus on preserving existing site features... The Layout.pdf document provides area statements, including details on circulation areas, which total 50sqm..."
```

## Scenario 03: Clarification Assistance
```text
Timestamp: 2026-06-03
Question: Help me respond to this clarification. (Context: "Missing circulation calculations.")
Classifier: CLARIFICATION
Engine: ClarificationAssistanceEngine
Ontology Queries: knowledge_review_criteria (filtered by credit_id for 'EDA C1')
Workflow Queries: N/A
Evidence Queries: project_document
Records Returned: Review criteria = "Verify that the design documents indicate preservation of existing site features."
Final Response: "We acknowledge your concern regarding the missing circulation calculations... However, we would like to clarify that the IGBC Review Criteria for EDA C1 primarily focuses on verifying that the design documents indicate preservation of existing site features."
```

## Scenario 04: Contributor Copilot
```text
Timestamp: 2026-06-03
Question: What should Architect do today?
Classifier: CONTRIBUTOR_COPILOT
Engine: ContributorCopilotEngine
Ontology Queries: N/A
Workflow Queries: workflow_role, workflow_document_responsibility (filtered by role="Architect")
Evidence Queries: project_document (matching workflow assignments)
Records Returned: 4 Pending Document Types (DRAWING, CALCULATION, DAYLIGHT_ANALYSIS, SPECIFICATION)
Final Response: "**Contributor Copilot — Architect**\nResponsibilities:\n  • DRAWING\n  • CALCULATION\n  • DAYLIGHT_ANALYSIS\n  • SPECIFICATION\n▶ Priority Action:\n  Upload missing: DRAWING"
```

## Scenario 05: Submission Readiness
```text
Timestamp: 2026-06-03
Question: Why is EDA C1 not ready?
Classifier: SUBMISSION_READINESS
Engine: SubmissionReadinessEngine
Ontology Queries: N/A
Workflow Queries: N/A
Evidence Queries: project_document (filtered by doc_category='EDA C1')
Records Returned: 0 documents
Final Response: "No. There are no uploaded documents for EDA C1 yet."
```
