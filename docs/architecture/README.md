# Tracknov Enterprise Platform Architecture Diagrams

This document contains visual architectural specifications for the Tracknov Sustainability Intelligence Operating System.

---

## 1. Document Ingestion Flow

Shows the pipeline from raw file upload through safety analysis, OCR processing, semantic math deduplication, and database vector indexing.

```mermaid
graph TD
    A[Raw Document Upload] --> B[Upload Telemetry & Size Guards]
    B -->|Passed| C[OCR & Readability Engines]
    B -->|Failed| X[Rejection & Event Logged]
    C --> D[Semantic Math / Deduplication Check]
    D -->|Similarity > 0.95| E[AI Duplicate Registry Log]
    D -->|Similarity <= 0.95| F[Embedding Generation]
    F --> G[RAG & pgvector Indexing]
```

---

## 2. Deterministic Replay Pipeline

Illustrates how historical event logs are loaded, advisory locks acquired, and sequential mutations replayed to reconstruct verifiable state hashes.

```mermaid
graph LR
    A[Historical Audit Logs] --> B[Replay Queue Scheduler]
    B --> C[PG Advisory Lock Acquired]
    C --> D[Derived State Transitions Replayed]
    D --> E[Replay Hash Generator]
    E --> F{Matches Historical Hash?}
    F -->|Yes| G[Replay Attestation & Certificate Signed]
    F -->|No| H[Raise State Drift Alert / Quarantine]
```

---

## 3. Intelligence Lifecycle

Visualizes the lifecycle of AI-driven recommendations, confidence scoring, drafting, and strict L5/L6 human-in-the-loop review.

```mermaid
graph TD
    A[Raw Vector Data] --> B[Confidence Scoring Engine]
    B --> C[Heuristic Matching & Scoring]
    C --> D[AI Draft recommendation / Clarification]
    D --> E[Governance Advisory Gate Guardrail]
    E -->|Approved| F[Reviewer Cockpit Presentation]
    F -->|Human Authorized| G[Immutable State Commited]
    F -->|Human Disapproved| H[Extraction Tuner Correction Logger]
```

---

## 4. Governance & Mutation Enforcement

Details the nesting of guards and boundaries that shield the core state machine from unapproved mutations.

```mermaid
graph TD
    A[Mutation Request] --> B[Database Row-Level Security Layer]
    B --> C[Governance Mutation Interceptor]
    C --> D[Knowledge Mutation Guard]
    D --> E[Advisory Only Boundary Gate]
    E --> F[Immutable Audit Logger]
    F --> G[Transactional Commit]
```

---

## 5. Cross-Tenant Isolation

Illustrates the logical and structural boundaries preventing data leakage between tenants.

```mermaid
graph TD
    subgraph Tenant A Boundary
        A1[Tenant A Users] --> A2[Tenant A Web Requests]
        A2 --> A3[PostgreSQL connection pool: tenant_id = 'A']
        A3 --> A4[Isolated pgvector Embeddings Partition A]
    end
    subgraph Tenant B Boundary
        B1[Tenant B Users] --> B2[Tenant B Web Requests]
        B2 --> B3[PostgreSQL connection pool: tenant_id = 'B']
        B3 --> B4[Isolated pgvector Embeddings Partition B]
    end
    A4 -.->|LEAK BLOCK| B4
    B4 -.->|LEAK BLOCK| A4
```

---

## 6. AI Fallback Orchestration

Demonstrates the resilient fallback structure when connecting to semantic providers or when the system is offline.

```mermaid
graph TD
    A[Primary Gemini Pro API] -->|Timeout / Quota / Error| B[Gemini Flash API Endpoint]
    B -->|Network Failure / Offline| C[Local ONNX Transformers Inference]
    C -->|Core Failure| D[System Quarantined & Error Telemetry Dispatched]
```
