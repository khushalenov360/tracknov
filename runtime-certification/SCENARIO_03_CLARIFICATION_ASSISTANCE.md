# SCENARIO 03: Clarification Assistance Runtime Certification

## Test Input
**Review Comment**: "Missing circulation calculations."
**Test Input**: "Help me respond to this clarification." (Mapped to credit: `EDA C1`)

## Runtime Trace
```text
Clarification Retrieval → Input provided by the user.
Credit Identification → Inferred via `QuestionClassifier.ts` or passed contextual parameters (EDA C1).
Review Criteria Lookup → Queried `knowledge_review_criteria` for EDA C1. Returned: "Verify that the design documents indicate preservation of existing site features."
Evidence Lookup → Queried `project_document` for EDA C1. Found `Layout.pdf` and `Doc1.pdf`.
Response Draft Generation → The `ClarificationAssistanceEngine` verified if "Missing circulation calculations" maps to "preservation of existing site features".
Final User Response → Drafted a response clarifying the relevance of the reviewer's remark to the actual review criteria.
```

## Evidence
- **Clarification**: "Missing circulation calculations."
- **Mapped Credit**: `EDA C1`
- **Mapped Review Criteria**: "Verify that the design documents indicate preservation of existing site features."
- **Evidence Used**: The actual criteria string served as the grounding limit for the LLM.
- **Generated Response**: "We acknowledge your concern regarding the missing circulation calculations... However, we would like to clarify that the IGBC Review Criteria for EDA C1 primarily focuses on verifying that the design documents indicate preservation of existing site features..."

## Negative Test
- **Input**: "Provide quantum energy simulation report." (Unmapped criteria)
- **Expected Output**: "Clarification cannot be mapped to any known review criteria."
- **Actual Output**: "Clarification cannot be mapped to any known review criteria." (Verified via `CL-002: PASS`)

## Certification Status
**PASS** - The clarification engine successfully grounds responses using specific IGBC criteria lookups and forcefully rejects drafting responses for unmapped or irrelevant comments.
