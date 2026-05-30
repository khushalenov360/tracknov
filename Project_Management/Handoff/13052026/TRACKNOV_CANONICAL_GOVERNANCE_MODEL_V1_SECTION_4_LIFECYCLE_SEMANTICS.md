# TRACKNOV_CANONICAL_GOVERNANCE_MODEL_V1
# Section 4 — Lifecycle Semantics

## PURPOSE OF THIS SECTION

This section defines the authoritative semantic meaning of lifecycle states inside Tracknov.

While Section 3 defines:
- workflow structure
- transition legality
- orchestration behavior

This section defines:
- governance interpretation
- operational meaning
- mutation consequences
- replay implications
- certification implications
- export implications
- isolation implications

This section is authoritative.

---

# 4.1 LIFECYCLE SEMANTIC PHILOSOPHY

A lifecycle state inside Tracknov is NOT:
- a UI label
- a frontend display value
- a cosmetic progress indicator

A lifecycle state represents:
> authoritative governance truth at a specific point in time.

Therefore lifecycle semantics MUST:
- remain deterministic
- remain replayable
- remain framework-consistent
- remain operationally unambiguous

---

# 4.2 DRAFT — SEMANTIC DEFINITION

## Canonical Meaning

DRAFT represents:
> non-authoritative mutable preparation state.

The governance system does NOT yet recognize DRAFT as certification-relevant truth.

---

## Operational Interpretation

DRAFT means:
- evidence preparation in progress
- validation incomplete
- governance submission not initiated
- certification computation excluded

---

## Mutation Behavior

In DRAFT:
- evidence may be uploaded
- mappings may change
- metadata may change
- validation may re-run

BUT:
- approvals forbidden
- exports forbidden
- scoring forbidden

---

## Replay Semantics

Replay MUST:
- preserve all DRAFT mutations
- preserve evidence lineage
- preserve preparatory history

DRAFT history remains replay-visible even if never submitted.

---

# 4.3 READY — SEMANTIC DEFINITION

## Canonical Meaning

READY represents:
> validation-complete governance eligibility state.

READY does NOT mean approved.
READY means:
- governance submission is legally permitted.

---

## Operational Interpretation

READY indicates:
- mandatory evidence present
- validation passing
- dependency checks passing
- submission eligibility achieved

---

## Governance Implications

READY enables:
- governed submission
- queue admission
- workflow activation

READY does NOT enable:
- scoring authority
- certification truth
- export generation

---

## Replay Semantics

Replay MUST reconstruct:
- exact validation state
- exact evidence state
- exact readiness conditions

---

# 4.4 SUBMITTED — SEMANTIC DEFINITION

## Canonical Meaning

SUBMITTED represents:
> official governance submission initiation.

At this point the workflow becomes:
- governance-visible
- replay-visible
- audit-governed

---

## Operational Interpretation

SUBMITTED means:
- governance authority engaged
- queue orchestration begins
- transition lineage becomes authoritative

---

## Governance Implications

SUBMITTED activates:
- assignment eligibility
- review orchestration
- concurrency protection
- replay reconstruction requirements

---

## Mutation Restrictions

After SUBMITTED:
- unrestricted editing forbidden
- destructive mutation forbidden
- silent evidence replacement forbidden

---

# 4.5 UNDER_REVIEW — SEMANTIC DEFINITION

## Canonical Meaning

UNDER_REVIEW represents:
> active governed evaluation state.

This state indicates:
- authoritative reviewer ownership
- governed decision-making in progress

---

## Operational Interpretation

UNDER_REVIEW means:
- queue ownership active
- approval/rejection authority active
- stale-state risks elevated

---

## Governance Implications

UNDER_REVIEW requires:
- serialized governance execution
- deterministic reviewer lineage
- replay-visible review activity

---

## Security Implications

The system MUST:
- prevent concurrent approvals
- reject stale reviewer actions
- preserve idempotent outcomes

---

# 4.6 CLARIFICATION — SEMANTIC DEFINITION

## Canonical Meaning

CLARIFICATION represents:
> governance-recognized insufficiency requiring additional evidence or explanation.

CLARIFICATION is NOT:
- rejection
- workflow reset
- evidence deletion

---

## Operational Interpretation

CLARIFICATION means:
- review incomplete
- governance requires supplementation
- lineage continuity preserved

---

## Governance Implications

The system MUST:
- preserve original evidence lineage
- preserve clarification lineage
- preserve reviewer rationale

Clarification evidence MUST remain additive.

---

## Replay Semantics

Replay MUST reconstruct:
- original review state
- clarification request
- clarification evidence additions
- clarification resolution

---

# 4.7 RESUBMITTED — SEMANTIC DEFINITION

## Canonical Meaning

RESUBMITTED represents:
> governance re-entry after clarification fulfillment.

---

## Operational Interpretation

RESUBMITTED means:
- clarification obligations completed
- workflow reactivated
- governance evaluation resumes

---

## Governance Implications

The system MUST:
- preserve original clarification lineage
- preserve previous reviewer lineage
- maintain deterministic sequencing

---

## Replay Semantics

Replay MUST reconstruct:
- clarification history
- resubmission timing
- evidence delta lineage

---

# 4.8 APPROVED — SEMANTIC DEFINITION

## Canonical Meaning

APPROVED represents:
> authoritative governance acceptance.

APPROVED is:
- certification-relevant truth
- scoring-relevant truth
- export-relevant truth

---

## Operational Interpretation

APPROVED means:
- evidence accepted
- workflow completed successfully
- derived-state propagation authorized

---

## Governance Implications

APPROVED activates:
- scoring propagation
- readiness propagation
- certification evaluation
- export eligibility

---

## Replay Semantics

Replay MUST reconstruct:
- reviewer lineage
- approval rationale
- approval timestamp
- downstream propagation chain

---

# 4.9 REJECTED — SEMANTIC DEFINITION

## Canonical Meaning

REJECTED represents:
> authoritative governance denial.

---

## Operational Interpretation

REJECTED means:
- evidence insufficient
- governance requirements unmet
- certification satisfaction denied

---

## Governance Implications

REJECTED triggers:
- downstream recalculation
- readiness degradation
- export invalidation if applicable

---

## Replay Semantics

Replay MUST preserve:
- rejection rationale
- rejection lineage
- affected downstream recalculations

---

# 4.10 REVOKED — SEMANTIC DEFINITION

## Canonical Meaning

REVOKED represents:
> governed invalidation of previously authoritative truth.

This is one of the highest-governance states in the platform.

---

## Operational Interpretation

REVOKED means:
- prior approval no longer trustworthy
- downstream certification truth impacted
- exports potentially stale
- reconciliation required

---

## Governance Implications

REVOKED MUST trigger:
- certification downgrade propagation
- export invalidation
- reconciliation generation
- replay-visible correction lineage

---

## Security Implications

Revocation MUST require:
- governed authorization
- explicit rationale
- immutable audit generation

Silent revocation is forbidden.

---

## Replay Semantics

Replay MUST reconstruct:
- original approval
- revocation event
- downstream impacts
- certification degradation sequence

---

# 4.11 LOCKED — SEMANTIC DEFINITION

## Canonical Meaning

LOCKED represents:
> immutable governance closure boundary.

---

## Operational Interpretation

LOCKED means:
- certification truth frozen
- hostile mutations forbidden
- export authority finalized

---

## Governance Implications

LOCKED activates:
- immutable evidence preservation
- export freeze
- mutation lock enforcement
- replay-sealed historical truth

---

## Security Implications

After LOCKED:
- uploads forbidden
- destructive edits forbidden
- unauthorized overrides forbidden
- replay mutation forbidden

---

## Replay Semantics

Replay MUST:
- preserve sealed truth
- preserve historical exports
- preserve final lineage hashes

---

# 4.12 CROSS-FRAMEWORK LIFECYCLE LAW

Frameworks:
- IGBC
- LEED
- GRIHA
- ISO
- ESG assurance systems

may define:
- custom validations
- custom scoring
- custom evidence semantics

BUT lifecycle meanings MUST remain canonical.

Frameworks may EXTEND governance logic.
Frameworks may NOT redefine lifecycle truth.

---

# 4.13 LIFECYCLE INTEGRITY LAW

Lifecycle semantics MUST remain:
- deterministic
- replay-consistent
- operationally unambiguous
- certification-defensible

Lifecycle meaning MUST NEVER depend on:
- UI interpretation
- frontend assumptions
- undocumented runtime behavior

---

# 4.14 FINAL SEMANTIC LAW

Inside Tracknov:

Lifecycle state =
> authoritative governance interpretation of operational truth.

Therefore all lifecycle semantics MUST prioritize:
- audit defensibility
- replay integrity
- certification truth
- deterministic governance

before:
- convenience
- workflow shortcuts
- UI simplification

WITHOUT exception.

END OF SECTION