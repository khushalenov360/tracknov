# TRACKNOV - Runtime-Enforceable Implementation Semantics Plan

Source: User-provided implementation governance handoff (2026-05-06)

## Purpose

This document defines the implementation approach required to convert governance architecture, audit expectations, AI runtime requirements, and workflow enforcement rules into deterministic runtime behavior.

## Primary Objective

Transform Tracknov from feature-driven SaaS into deterministic certification execution infrastructure.

## Current Root Problem

Current implementation issues called out by this handoff:

- Raw AI orchestration leakage: Critical
- Weak runtime enforcement: Critical
- Missing deterministic routing: Critical
- Missing authority boundaries: Critical
- Incomplete validation centralization: Critical
- Missing response normalization: High
- Weak workflow enforcement: High
- Missing degraded-operation semantics: High

## Mandatory Implementation Strategy

Do not reorder phases.

### Phase 1 - Runtime Authority Stabilization

Establish deterministic backend authority.

Required:

- Central orchestrator layer
- Validation gateway
- Workflow transition matrix
- Immutable audit layer

All mutations must flow through:

```text
Request
-> Orchestrator
-> Authorization
-> Validation
-> Workflow
-> Audit
-> Mutation
-> Derived Recalculation
-> Response
```

No document mapping, workflow transition, scoring, approval, or rejection may occur without central validation execution.

### Phase 2 - Runtime Semantics Definition

Eliminate ambiguous runtime behavior.

Define exact runtime meaning for:

- `proposed`: AI suggestion only
- `mapped`: validated linkage committed
- `ready`: validation-complete
- `submitted`: workflow transitioned
- `approved`: final authorized acceptance

No state may have multiple meanings, inferred meanings, or frontend-defined meanings.

Implement runtime truth matrices for:

- validation fail -> mutation blocked
- AI timeout -> fallback response
- stale workflow -> reject action
- unauthorized access -> deny retrieval

Define failure trees for:

- rollback behavior
- retry behavior
- degraded operation behavior
- conflict behavior
- reconciliation behavior

### Phase 3 - AI Runtime Governance

Convert AI into a governed deterministic assistant.

Mandatory routing hierarchy:

```text
DB
-> Validation
-> Workflow
-> AI
```

AI must never answer deterministic questions such as project counts, workflow states, pending items, or validation results if a deterministic source exists.

AI may only receive authorized, project-scoped, workflow-scoped, validation-filtered context.

No raw RAG dumps, retrieval scores, internal telemetry, or vector metadata may reach the frontend.

All AI responses must normalize into:

- Assessment
- Fit
- Reason
- Recommendation
- Confirmation Request

AI may summarize, explain, suggest, and classify.

AI may not mutate, approve, reject, transition, or override validation.

### Phase 4 - Enforcement Matrices

Produce:

- action authority matrix
- mutation authority matrix
- workflow authority matrix
- AI capability matrix

### Phase 5 - Runtime Diagrams

Produce canonical diagrams for:

- document upload lifecycle
- AI query lifecycle
- workflow transition lifecycle
- validation lifecycle
- rollback lifecycle
- conflict resolution lifecycle
- authorization lifecycle

### Phase 6 - API Execution Contracts

Every mutation API must define:

- authorization sequence
- validation sequence
- workflow checks
- mutation rules
- audit obligations
- rollback behavior
- side effects

No mutation API may directly mutate DB, bypass orchestrator, or bypass validation.

### Phase 7 - Frontend Trust Boundary

Frontend must never determine permissions, workflow legality, validation success, or certification readiness.

Frontend is rendering and interaction layer only.

### Phase 8 - Reconciliation Engine

Implement:

- derived-state reconciliation
- orphan detection
- workflow desync detection
- audit consistency checks
- validation consistency checks

### Phase 9 - AI Security Hardening

Mandatory protections:

- prompt injection sanitization
- project-scoped retrieval
- authorization-before-retrieval
- AI context filtering
- DTO filtering

### Phase 10 - Testing and Validation

Create test suites for:

- workflow enforcement
- validation authority
- AI hallucination
- prompt injection
- concurrency
- rollback
- tenant isolation
- fallback

## Governance Rule

Developer must not infer behavior, workflow semantics, state meanings, or authority boundaries. If ambiguity exists, stop and request clarification.

## Required Delivery Order

1. Orchestrator layer
2. Validation centralization
3. Workflow enforcement
4. Immutable audit
5. Runtime semantics
6. AI governance
7. Enforcement matrices
8. Runtime diagrams
9. Reconciliation
10. Optimization

## Definition of Done

A feature is not complete unless it is deterministic, auditable, validation-enforced, workflow-enforced, reconciliation-safe, AI-governed, rollback-safe, and concurrency-safe.

## Final Principle

Tracknov must behave like enterprise certification execution infrastructure, not AI-enhanced project management software.
