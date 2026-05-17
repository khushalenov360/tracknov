# Tracknov: Deterministic Sustainability Intelligence Operating System

Tracknov is a next-generation, audit-defensible enterprise platform designed for managing, analyzing, and certifying sustainability documentation under rigorous regulatory frameworks (including IGBC Green Interiors v2).

By combining advanced semantic indexing with deterministic audit replays, strict tenant isolation, and unified governance layers, Tracknov transitions environmental sustainability management from a workflow SaaS into a secure, verifiable operational asset.

---

## 1. Enterprise Architecture & Bounded Domains

Tracknov's codebase is structured into explicit, bounded architectural domains inside the `/lib` namespace to prevent complexity accumulation and ensure high maintainability.

```
/lib/
├── intelligence/             # Core Semantic / AI Systems
│   ├── extraction/           # Heuristic and LLM data extraction
│   ├── governance/           # AI compliance boundaries
│   ├── learning/             # Cross-tenant learning and boundary guards
│   ├── retrieval/            # Vector and semantic query retrieval
│   ├── explainability/       # AI decision and draft justifications
│   ├── benchmarking/         # Metric and accuracy validation
│   └── shared/               # SemanticMath and ConfidenceEngine utilities
├── replay/                   # Transaction Determinism & Drift Verification
├── governance/               # Ontology Governance & Mutation Guards
├── document-intelligence/    # Ingestion, OCR, and Document Pipelines
└── telemetry/                # Standardized Audit & Observability Streams
```

---

## 2. Platform Core Guarantees

### A. Replay Determinism Guarantee
Tracknov implements Layer-5 (Audit) and Layer-6 (Certification) execution runtimes. Any historical state can be replayed from immutable event logs to verify correctness.
* **Accuracy**: Restores state transitions with **0.00000% numeric drift**.
* **Purity**: Replay validations are executed in memory-isolated processes that automatically block external runtime side-effects (e.g. database overrides, emails, webhooks).

### B. Tenant Isolation Guarantee
* **Database RLS**: Strict Row-Level Security policies are enforced on connections at the transaction pool level.
* **Vector Boundary**: Organization vector indexes are separated logically to ensure that search matches or semantic recommendations never leak cross-project context.

### C. Intelligence Safety Guarantee
* **Advisory-Only Law**: Enforces the absolute boundary where AI modules operate in a strictly advisory state. State modifications require human sign-off from L5/L6 authorities.
* **Quarantine Boundary**: Automatically redirects poisoned patterns, high-entropy vocabulary shifts, or malicious documents to a quarantine ledger before index contamination.

### D. Benchmark & Operational Certifications
* **Isolated Suite Execution**: All intensive stress-testing and soak-testing run in separate fast CI bypasses under the `/benchmarks/runtime/` directory.
* **Backward-Compatible Contracts**: Any changes to state structures must preserve historical replay serializations to ensure continuous audit lineage.

---

## 3. Fast Onboarding

To bootstrap the local development stack on Windows, execute the unified launcher:

```powershell
powershell -ExecutionPolicy Bypass -File .\Start-Tracknov.ps1
```

### Stack Profile:
* **Framework**: Next.js (App Router, strict TypeScript)
* **Storage & Ledgers**: Supabase PostgreSQL with `pgvector`
* **Performance Control**: Centralized `ProviderGovernance` for LLM cost-attribution and quota clamping
* **Deduplication Engine**: Centralized `SemanticMath` library for vector similarity comparisons
