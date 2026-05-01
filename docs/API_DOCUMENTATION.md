# Tracknov V2 API Documentation

## Overview
Tracknov V2 uses a service-oriented backend architecture with role-based access control (RBAC).

## Core Services

### 1. DocumentService (`lib/services/document-service.ts`)
- `uploadDocument(user, data)`: Atomic upload + token consumption.
- `updateMetadata(user, data)`: Move documents between credits.
- `deleteDocument(user, id)`: Soft delete with token refund logic.

### 2. BillingService (`lib/services/billing-service.ts`)
- `consumeDocumentTokens(user, data)`: Deduct tokens for evidence upload.
- `consumeConsultantTokens(user, data)`: Deduct tokens for interaction.
- `reconcileClientWallet(user, projectId)`: Audit-safe balance alignment.

### 3. ReviewService (`lib/services/review-service.ts`)
- `transitionDocument(user, data)`: Strict workflow state transitions.
- `bulkReview(user, data)`: Approval/rejection at scale.
- `addRemark(user, data)`: Context-aware feedback loop.

## Workflow States
`DRAFT` -> `READY` -> `SUBMITTED` -> `UNDER_REVIEW` -> `CLARIFICATION` -> `RESUBMITTED` -> `APPROVED` / `REJECTED`

## RBAC Roles
- `super_user`: Global system control.
- `project_admin`: Project-level validation and team control.
- `owner`: Business stakeholder (Review cockpit).
- `architect`: Detailed technical mapping and checklist.
- `mep`: Technical evidence upload.
- `client`: Executive read-only snapshot.

## Advanced Intelligence (M3/M4)
- `getBurnRateForecast(projectId)`: Predicts wallet exhaustion.
- `getVendorIntelligence()`: Ranks vendors by efficiency and approval rate.
- `rejection_patterns`: Analyzes common blockers using AI.
