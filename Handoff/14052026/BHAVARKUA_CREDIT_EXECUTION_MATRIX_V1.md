# 📘 TRACKNOV — BHAVARKUA CREDIT EXECUTION MATRIX  
## Developer Handoff (Operational Reality Phase)

# 🔴 1. OBJECTIVE

Developer must build:

Real Evidence → Credit Execution Matrix

using:
- Bhavarkua GI V1 guidebook
- Bhavarkua real submission dataset
- existing execution baseline
- workflow governance rules

Final output becomes:
- authoritative operational execution layer
- validation backbone
- reviewer guidance source
- AI grounding source
- runtime orchestration map

# 🔴 2. REQUIRED MATRIX STRUCTURE

Each row MUST represent:
ONE operational submittal execution unit

NOT abstract credits.

# 🔴 3. REQUIRED MATRIX COLUMNS

Mandatory structure:

| Column | Description |
|---|---|
| rating_system | IGBC system |
| credit_code | Exact credit |
| credit_name | Exact credit name |
| stage | DESIGN / CONSTRUCTION |
| submittal_code | Internal deterministic code |
| submittal_name | Actual operational requirement |
| evidence_type | DRAWING / REPORT / PHOTO / etc |
| mandatory_flag | TRUE/FALSE |
| expected_documents | Expected evidence list |
| validation_requirements | Deterministic checks |
| reviewer_role | L1 / L3 |
| clarification_risk | LOW/MED/HIGH |
| replay_dependency | TRUE/FALSE |
| derived_state_impact | affected entities |
| scoring_dependency | points impact |
| cross_credit_usage | reused evidence |
| queue_priority | execution priority |
| approval_requirements | exact approval condition |
| rejection_conditions | deterministic blockers |
| version_sensitive | TRUE/FALSE |
| lineage_required | TRUE/FALSE |

# 🔴 4. REAL DATA EXTRACTION REQUIREMENT

Developer MUST:
- unpack Bhavarkua dataset
- classify all evidence
- normalize filenames
- detect duplicates
- detect ambiguous evidence
- detect reused evidence

# 🔴 5. FORBIDDEN BEHAVIOR

Developer MUST NOT:
- invent credits
- infer missing IGBC logic
- fabricate mappings
- assume evidence meaning
- auto-classify uncertain evidence silently

If uncertain:
mark as REVIEW_REQUIRED

# 🔴 6. REQUIRED DOCUMENT CLASSIFICATION

Every real file MUST classify into:
- DRAWING
- REPORT
- CALCULATION
- PHOTO
- CERTIFICATE
- DECLARATION
- INVOICE
- BOQ
- POLICY

# 🔴 7. FILE NORMALIZATION ENGINE

Developer MUST implement:
normalizeEvidenceName()

# 🔴 8. CREDIT ↔ EVIDENCE MAPPING RULE

Mappings MUST support:
- ONE document → MANY submittals
- ONE submittal → MANY documents

# 🔴 9. OPERATIONAL VALIDATION REQUIREMENT

Validation must operate on:
- actual evidence presence
- actual document lineage
- actual mandatory evidence

# 🔴 10. CLARIFICATION RISK ENGINE

Developer MUST calculate:
clarification_risk_score

# 🔴 11. REPLAY DEPENDENCY DETECTION

Developer MUST identify whether evidence affects:
- scoring
- certification level
- exports
- downstream approvals
- snapshots

# 🔴 12. CROSS-CREDIT EVIDENCE DETECTION

Developer MUST detect:
same document_version → mapped to multiple credits

# 🔴 13. REQUIRED OUTPUT FILES

Developer MUST generate:
- BHAVARKUA_CREDIT_EXECUTION_MATRIX_V1.csv
- BHAVARKUA_EVIDENCE_CLASSIFICATION.json
- BHAVARKUA_CLARIFICATION_RISK_REPORT.md
- BHAVARKUA_CROSS_CREDIT_DEPENDENCIES.md
- BHAVARKUA_RUNTIME_SIMULATION_REPORT.md

# 🔴 14. REQUIRED RUNTIME SIMULATION

Developer MUST simulate:
Upload → Validation → Mapping → Review → Clarification → Resubmission → Approval → Scoring → Replay

# 🔴 15. REQUIRED FAILURE TESTS

Must test:
- duplicate uploads
- stale versions
- renamed files
- missing mandatory evidence
- reused evidence rejection
- clarification loops
- replay invalidation
- cross-credit evidence modification

# 🔴 16. ACCEPTANCE CRITERIA

| Requirement | Mandatory |
|---|---|
| Real evidence classified | ✅ |
| Credits mapped deterministically | ✅ |
| Clarification risks identified | ✅ |
| Cross-credit dependencies mapped | ✅ |
| Replay-sensitive evidence detected | ✅ |
| Runtime simulation executed | ✅ |
| No fabricated mappings | ✅ |
| Queue behavior validated | ✅ |
| Lineage traceable | ✅ |
