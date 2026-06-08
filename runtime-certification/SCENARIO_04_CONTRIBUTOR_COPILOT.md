# SCENARIO 04: Contributor Copilot Runtime Certification

## Test Input
```text
What should Architect do today?
```

## Runtime Trace
```text
Role Detection → Found "Architect" using `QuestionClassifier.ts`.
Workflow Lookup → Queried `workflow_role` to find the role ID for Architect.
Assignment Lookup → Queried `workflow_document_responsibility` for assignments mapped to Architect role ID.
Document Lookup → Cross-referenced assignments with `project_document` to check what is uploaded vs pending.
Priority Calculation → Identified missing items based on workflow mappings.
Final Response → Formatted Copilot response highlighting priority tasks.
```

## Evidence
- **Assignments**: Architect is mapped to `DRAWING`, `CALCULATION`, `DAYLIGHT_ANALYSIS`, and `SPECIFICATION`.
- **Pending Items**: All 4 are pending.
- **Rejected Items**: None.
- **Blocked Items**: None.
- **Highest Priority Action**: `Upload missing: DRAWING`

## Negative Test
- **Input**: "What should some-fake-role do today?"
- **Expected Output**: "I couldn't identify a contributor role..."
- **Actual Output**: "I couldn't identify a contributor role in your query. Try specifying one of: Architect, MEP Consultant, Contractor, PMC, Client, Sustainability Consultant, Structural Consultant, Landscape Architect." (Verified via `CC-002: PASS`)

## Certification Status
**PASS** - Responses strictly adhere to workflow mappings and project evidence context. Unknown or hallucinated roles are successfully rejected.
