# Tracknov V2 Architecture Gap Action Plan

Date: 2026-04-29 IST  
Applies to: current Tracknov codebase (`Next.js + Supabase`)  
Source: user-provided V2 target architecture and technical audit

## 1. Target Architecture (Mapped to Tracknov Stack)

Core principle: separate workflow, AI, billing, and notifications into independent systems connected via events.

```text
tracknov/
  core/
    database/
    auth/
    logging/
    config/
  services/
    project-service/
    document-service/
    review-service/
    billing-service/
    notification-service/
  workflow/
    state-machine.ts
    transitions.ts
  ai-engine/
    rag/
    embeddings/
    validator/
    risk-engine/
    recommendation/
  events/
    event-bus.ts
    producers/
    consumers/
  api/
    routes/
    serializers/
  dashboards/
    client-dashboard/
    admin-dashboard/
  workers/
    queue-worker.ts
```

Tracknov implementation note:
- Keep `app/` for request/UI orchestration only.
- Move domain logic into `lib/services`, `lib/workflow`, `lib/events`, `lib/ai`.

---

## 2. Workflow Engine (Critical Fix)

Current gap:
- lifecycle logic is spread across server actions and status checks.

Target:
- explicit state machine with centralized transition guards.

### Canonical state model
```ts
export enum DocumentState {
  UPLOADED = "uploaded",
  OWNER_REVIEW = "owner_review",
  ADMIN_REVIEW = "admin_review",
  APPROVED = "approved",
  REJECTED = "rejected",
}
```

### Allowed transitions
```ts
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  uploaded: ["owner_review"],
  owner_review: ["admin_review", "rejected"],
  admin_review: ["approved", "rejected"],
  rejected: ["uploaded"],
};
```

Tracknov mapping:
- `uploaded` -> pending owner review
- `owner_approved` currently behaves as admin review stage
- V2 should normalize internal state terms while preserving UI labels.

Required deliverables:
1. `lib/workflow/state-machine.ts`
2. `lib/workflow/transitions.ts`
3. Transition audit log with `from_state`, `to_state`, `actor_role`, `reason`.

---

## 3. AI Engine V2

## 3.1 RAG foundation (Immediate)
Flow:
1. document ingest
2. chunking
3. embedding
4. vector retrieval
5. grounded response

Target modules:
- `lib/ai/embeddings/index.ts`
- `lib/ai/rag/retriever.ts`
- `lib/ai/rag/answer.ts`

Storage option:
- Supabase `pgvector` first
- optional external vector DB later

## 3.2 Validator module
`lib/ai/validator/validator.ts` should score:
- file type compliance
- naming quality
- credit relevance confidence
- missing mandatory evidence hints

## 3.3 Risk engine (Priority AI service)
`lib/ai/risk-engine/calculate-risk.ts`:
- weighted backlog
- rejection rate
- inactivity
- token runway stress

Output:
- risk score + RAG label (green/amber/red)

## 3.4 Recommendation engine
`lib/ai/recommendation/next-best-action.ts`:
- role-specific action guidance
- rejection correction suggestions
- escalation suggestions for owner/admin/client roles

---

## 4. Database V2 Schema Upgrades

## Existing base
- projects
- credits
- documents
- project_members
- notifications
- token tables

## Required additions

### 4.1 `document_reviews` (non-negotiable)
Purpose: immutable review timeline separate from mutable `documents.status`.

Columns:
- `id`
- `document_id`
- `project_id`
- `reviewer_id`
- `reviewer_role`
- `action` (`approve`, `reject`, `send_back`, `resubmit`)
- `status_after`
- `remarks`
- `created_at`

### 4.2 Token ledger hardening
Use immutable ledger semantics for `client_token_transactions`:
- mandatory `type` (`debit`/`credit`)
- mandatory `source` (`upload`, `consulting`, `refund`, `manual_adjustment`)
- `reference_id` (document/session/invoice)
- idempotency key

### 4.3 AI support tables
- `document_embeddings`
- `rejection_patterns`
- `document_similarity_cache`

---

## 5. Event-Driven System

Current gap:
- logic is mostly synchronous in request path.

V2 event pattern:
`DOCUMENT_UPLOADED` ->
1. billing consumer (token debit)
2. AI validator consumer
3. notification consumer
4. dashboard refresh consumer

Phase approach:
1. Start with queue + worker abstraction (`lib/events` + worker process)
2. Add retries + dead-letter
3. Optional future move to Kafka for higher throughput

Deliverables:
- `lib/events/event-bus.ts`
- producer utilities in services
- consumer handlers per domain

---

## 6. Security and RBAC Hardening

Mandatory capability matrix:

| Role | Permissions |
|---|---|
| L0 (Architect/MEP/Contractor) | upload, edit own pre-review mappings |
| L1 (Owner) | owner review approve/reject |
| L3 (Project Admin) | final approve/reject, submission inclusion |
| L5 (Super User) | cross-client override, billing controls |

Required controls:
1. middleware checks on every mutating API/server action
2. project-level isolation on all reads/writes
3. automated RBAC matrix tests

---

## 7. Monetization V2

Required enhancements:
1. wallet and burn dashboard:
   - tokens remaining
   - weekly burn rate
   - predicted exhaustion date
2. premium AI billing path:
   - optional token charge classes for AI features
3. vendor intelligence commercial layer:
   - vendor approval success profile
   - reusable evidence confidence score

---

## 8. Frontend V2 Upgrade Targets

1. strict role-based UI surfaces:
   - L0 upload-centric
   - L1 review-centric
   - L2 executive metrics-centric
2. near-real-time updates:
   - review queue
   - alerts
   - token wallet and risk signals
3. persistent AI Copilot:
   - context-sensitive next best action
   - risk alerts
   - compliance guidance

---

## 9. 12-Week Execution Roadmap

## Phase 1 (Weeks 1-3): Foundation
1. service layer extraction
2. workflow state machine
3. token ledger hardening and idempotency

## Phase 2 (Weeks 4-6): AI Foundation
1. RAG ingest + retrieval
2. validator service
3. rejection pattern capture

## Phase 3 (Weeks 7-9): Intelligence
1. risk engine
2. recommendation engine
3. dashboard analytics enrichment

## Phase 4 (Weeks 10-12): Scale
1. event bus + async consumers
2. worker tuning and retries
3. performance and observability hardening

---

## 10. KPI Targets (Post Upgrade)

| Metric | Target |
|---|---|
| Rejection rate | down 40% |
| Processing time | down 30% |
| Revenue per client | up 3-5x |
| User productivity | up 2x |

---

## 11. Immediate Action Items (Next Implementation Sprint)

1. Implement `workflow/state-machine.ts` and migrate document transitions to it.
2. Add migration for `document_reviews`.
3. Add idempotency key support for upload+token operations.
4. Introduce `events/event-bus.ts` and route notification writes via handler.
5. Add RBAC automation tests for cross-project access and stage-based permissions.

