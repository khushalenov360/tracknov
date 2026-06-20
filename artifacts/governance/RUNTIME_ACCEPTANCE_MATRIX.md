# Runtime Acceptance Matrix

Last updated: 2026-06-20 IST

## Phase 3 - Certification Closure Engine

| Requirement | Status | Evidence |
| --- | --- | --- |
| Snapshot freeze before final certification lock | PASS | `lib/harita-engine/services/project-service.ts` calls `generateSnapshot(...)` before `CERTIFIED_LOCKED` transition |
| Submission freeze after certification lock | PASS | `lib/harita-engine/services/project-service.ts` blocks mutation when `certification_state === "CERTIFIED_LOCKED"` |
| Immutable export gate after lock | PASS | `lib/harita-engine/services/export-service.ts` rejects regeneration on `CERTIFIED_LOCKED` |
| Submission package archive output | PASS | `app/api/projects/[id]/submission-pack/route.ts` returns `*.zip` artifact |

## Phase 4 - AI + Deterministic Rule Validation

| Requirement | Status | Evidence |
| --- | --- | --- |
| Deterministic-first validation authority | PASS | `lib/harita-engine/governance/evidenceValidationEngine.ts` remains authoritative |
| AI advisory-only behavior | PASS | `tracknov-ai-server/src/services/vertexService.ts` only streams analysis; it does not execute workflow mutations |
| Human-only finalization | PASS | `lib/harita-engine/intelligence/agents/reviewer.ts` explicitly blocks AI approval/submission authority |

## Phase 5 - Enterprise Hardening

| Requirement | Status | Evidence |
| --- | --- | --- |
| Runtime acceptance matrix present | PASS | This artifact |
| Golden flow artifact present | PASS | `artifacts\governance\GOLDEN_FLOW.md` |
| Submission packaging archive path present | PASS | `app/api/projects/[id]/submission-pack/route.ts` |
| Certification archive lineage logging present | PASS | `lib/harita-engine/services/export-service.ts` writes `export_generation_history` |
