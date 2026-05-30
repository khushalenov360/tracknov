# IGBC Developer Handoff

## OBJECTIVE

Build a rule-driven IGBC certification engine (not a document manager) that:

- Structures: Rating System -> Credits -> Stage-wise Submittals
- Enforces: Workflow State Machine (Submittal -> Credit -> Project)
- Supports: Design + Construction dual lifecycle
- Maintains: Audit-grade traceability, overrides, versioning

## SYSTEM ARCHITECTURE (TARGET)

Project
|- RatingSystem
|- Credits
|  |- Credit_Stages (DESIGN / CONSTRUCTION)
|     |- Submittals
|        |- Documents (versioned)
|
|- Workflow Engine (State Machine)
|- Scoring Engine (rule-based)
|- Inheritance Engine (Design -> Construction)
|- Override Engine (Admin controlled)
|- Audit Engine (logs + export)

## CORE MODULES TO BUILD

### 1) CREDIT-STAGE DATA MODEL (FOUNDATION)

Work:
- Convert JSON -> relational schema
- Implement stage separation inside same credit

Tables:
- rating_systems
- credits
- credit_stages (credit_id, stage, state, version)
- submittals (credit_stage_id, type, required_flag)
- documents (submittal_id, file, version, status)
- document_versions

Outcome:
- One credit supports both stages without duplication
- Submittals strictly mapped to stage

### 2) WORKFLOW STATE MACHINE (STRICT ENGINE)

Work:
- Implement hard backend-controlled transitions
- No UI-driven state changes

Levels:
- Submittal
- Credit (derived)
- Project (derived)

Outcome:
- No invalid transitions possible
- Fully IGBC-aligned lifecycle enforced

### 3) STAGE ENGINE (DUAL PHASE LOGIC)

Work:
- Add stage = DESIGN / CONSTRUCTION
- Independent lifecycle per stage

Outcome:
- Design certification -> unlocks construction
- Separate submission packs per stage

### 4) INHERITANCE ENGINE (DESIGN -> CONSTRUCTION)

Work:
- Reference linking (not duplication)
- Carry forward:
  - Approved narratives
  - Calculations

Add fields:
documents:
- source_stage
- source_version_id
- inherited_flag

Outcome:
- Construction starts with baseline context
- Full traceability maintained

### 5) OVERRIDE ENGINE (ADMIN CONTROLLED)

Work:
- Credit-level override only
- Support:
  - Design override (full reset downstream)
  - Construction override (partial + full)

Tables:
override_logs
- credit_id
- stage
- override_type
- affected_submittals
- reason
- admin_id
- timestamp

Outcome:
- Safe corrections without breaking audit
- All overrides traceable

### 6) VERSIONING SYSTEM (NON-NEGOTIABLE)

Work:
- Every document update = new version
- Old versions immutable

Outcome:
- Full IGBC audit trace
- Compare before vs after

### 7) SCORING ENGINE (RULE-BASED)

Work:
- Implement:
  - Mandatory credit enforcement
  - Points aggregation
  - Certification thresholds

Logic:
- Design -> provisional score
- Construction -> final score

(Fact: IGBC certification is based on 100-point scale in most systems)

Outcome:
- Auto certification calculation
- No manual scoring

### 8) SUBMISSION PACK ENGINE

Work:
- Auto-generate:
  - Credit-wise bundle
  - Documents + narratives + calculations

Outcome:
- One-click submission pack
- Standardized IGBC-ready output

### 9) AUDIT ENGINE (TRACEABILITY)

Work:
- Track:
  - Every state change
  - Every upload
  - Every override

Tables:
audit_logs
- entity_type
- entity_id
- action
- user_id
- timestamp

Outcome:
- Legal-grade traceability

### 10) AUDIT EXPORT ENGINE (ON-DEMAND)

Work:
- Generate:
  - PDF (formal)
  - Excel (analysis)
- Include:
  - Credit states
  - Version history
  - Override logs
  - Timeline

Outcome:
- Compliance-ready reporting
- Enterprise credibility

## RBAC IMPLEMENTATION (AS PER HIERARCHY)

- L5 -> Full control (override + audit)
- L3 -> Workflow owner (submit, validate)
- L1 -> Internal approval
- L0 -> Upload only
- L2 -> Read-only

Outcome:
- No unauthorized actions
- Clean responsibility segregation

## HARD SYSTEM RULES

- No credit duplication across stages
- No state skipping
- No document overwrite (only versioning)
- No submission without mandatory submittals
- No certification without construction validation

## CRITICAL VALIDATIONS

- Mandatory credits must be APPROVED
- Submission blocked if incomplete
- Override must log reason
- Construction cannot start before design approval

## EXPECTED FINAL OUTCOME

If implemented correctly, Tracknov becomes:

- IGBC Certification Engine (Not Just SaaS Tool)
- Structured credit system
- Automated compliance validation
- Stage-wise lifecycle enforcement
- Audit-ready documentation
- Scalable to ALL IGBC rating systems

## FAILURE MODE (IF NOT FOLLOWED)

Becomes:
- File upload tool
- Manual tracking system
- No certification credibility

## SUCCESS METRIC

- Zero manual tracking outside system
- 100% audit traceability
- Submission packs generated without manual effort
- IGBC consultant can run full project inside Tracknov
