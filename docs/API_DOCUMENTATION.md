# Tracknov V2 API Documentation

## 1. Overview
Tracknov V2 uses a service-oriented architecture. Business logic is encapsulated in `lib/services`, while `app/actions.ts` provides thin wrappers for Next.js Server Actions.

---

## 2. Core Services

### 2.1 DocumentService (`lib/services/document-service.ts`)
Manages the lifecycle of documents, including storage and token billing.
- `uploadDocument(data)`: Validates, uploads to storage, and burns tokens atomically.
- `deleteDocument(id)`: Removes document and records activity.
- `resubmitDocument(id, data)`: Handles versioning and state transition for clarifications.

### 2.2 ReviewService (`lib/services/review-service.ts`)
Manages workflow transitions and rejection patterns.
- `transitionDocument(id, state, metadata)`: The primary state machine entry point.
- `bulkReview(ids, action, remark)`: High-throughput review processing for Owners/Admins.

### 2.3 BillingService (`lib/services/billing-service.ts`)
Manages the token economy and client wallets.
- `consumeTokens(userId, projectId, tokens, reason)`: Idempotent token deduction.
- `getWalletBalance(userId)`: Returns live balance and burn-rate forecast.

### 2.4 AIService (`lib/services/ai-service.ts`)
Provides intelligence for validation and risk scoring.
- `validateUploadCandidate(file)`: Pre-upload quality and relevance check.
- `getProjectRiskScore(projectId)`: Computes weighted risk based on rejections and delays.

---

## 3. Workflow States
The system enforces the following `workflow_state` transitions:
- `DRAFT` -> `READY`
- `READY` -> `SUBMITTED`
- `SUBMITTED` -> `UNDER_REVIEW` (Owner approval)
- `UNDER_REVIEW` -> `APPROVED` (Final Admin approval)
- `UNDER_REVIEW` -> `CLARIFICATION` / `REJECTED`

---

## 4. RBAC (Role-Based Access Control)
Roles are mapped to L0-L5 tiers:
- **L0 (Contributors)**: Architect, MEP, Contractor. Can upload to assigned credits.
- **L1 (Owner)**: Anita. Can review L0 submissions and forward to Admin.
- **L3/L5 (Admins)**: Project Admin, Super Admin, Super User. Final approval authority.

---

## 5. Intelligence Integrations
- **Duplicate Detection**: Uses SHA-256 `file_hash` lookup on the `documents` table.
- **RAG (Retrieval Augmented Generation)**: Embeddings stored in `embeddings` table for context-aware assistant.
