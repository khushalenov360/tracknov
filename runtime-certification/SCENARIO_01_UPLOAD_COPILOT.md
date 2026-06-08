# SCENARIO 01: Upload Copilot Runtime Certification

## Test Input
```text
User uploads Layout.pdf
```

## Runtime Trace
```text
Upload Event → Layout.pdf
DocumentParser Output → Extracted text content from PDF.
DocumentNormalizer Output → Normalized plain text for analysis.
DocumentClassifier Output → DRAWING
Evidence Mapping Output → Primary Credit: EDA C1, Role: Architect
Workflow Mapping Output → Role mapping found in workflow_document_responsibility table.
Gap Analysis Output → Missing site plan highlighting preserved areas, missing narrative explaining preservation strategy.
Final User Response → "📄 File Received: Layout.pdf\n\nDetected:\n  DRAWING\n\nMapped Credit:\n  EDA C1\n\nResponsible Role:\n  Architect\n\nEvidence Found:\n  (none detected)\n\nMissing:\n  ✗ site plan highlighting preserved areas\n  ✗ narrative explaining the preservation strategy\n\nAssessment:\n  Not Ready\n\nReadiness:\n  0%\n\nRecommended Action:\n  Upload site plan and provide a narrative explaining the preservation strategy to meet the required submission criteria."
```

## Evidence
- **Extracted Text**: Available in `project_document` intelligence metrics.
- **Detected Document Type**: `DRAWING`
- **Mapped Credit**: `EDA C1`
- **Mapped Requirement**: Evidence of existing site features preservation.
- **Responsible Contributor**: `Architect`
- **Evidence Found**: `(none detected)`
- **Evidence Missing**: `✗ site plan highlighting preserved areas`, `✗ narrative explaining the preservation strategy`
- **Recommended Action**: `Upload site plan and provide a narrative explaining the preservation strategy to meet the required submission criteria.`

## Certification Status
**PASS** - Output traces all criteria correctly to the ontology and database records, extracting actual evidence context instead of generic AI explanations.
