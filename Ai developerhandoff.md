# AI Developer Handoff — Tracknov V2

## 1. Objective

Build Tracknov V2 as a **scalable, AI-powered certification workflow platform** with:

* Structured workflow engine (state machine)
* Token-based billing with audit-safe ledger
* AI intelligence layer (RAG + validation + risk scoring)
* Event-driven architecture for scalability
* Role-based access control (RBAC)

---

## 2. Scope of Work (Modules to Build)

### 2.1 Workflow Engine

#### Work Description:

* Replace current `status`-based logic with a **state machine**
* Define allowed transitions between document states
* Enforce transitions at API/service level (not UI)

#### Required States:

* uploaded
* owner_review
* admin_review
* approved
* rejected

#### Expected Outcome:

* Zero invalid transitions
* Predictable document lifecycle
* Reduced workflow errors (~40% improvement benchmark)

---

### 2.2 Service Layer Refactor

#### Work Description:

Extract business logic from Django views into independent services:

* `document_service`
* `review_service`
* `billing_service`
* `project_service`

Each service must:

* Handle its own logic
* Be callable independently
* Avoid cross-service tight coupling

#### Expected Outcome:

* Clean architecture (DDD-aligned)
* Easier testing and scaling
* Enables AI integration without refactoring

---

### 2.3 Event-Driven System

#### Work Description:

Introduce async event system using **Celery + Redis**

#### Events to Implement:

* DOCUMENT_UPLOADED
* REVIEW_COMPLETED
* DOCUMENT_REJECTED
* TOKEN_DEDUCTED

#### Event Consumers:

* Billing service
* Notification service
* AI validator

#### Expected Outcome:

* Non-blocking operations
* Scalable processing
* Decoupled services

---

### 2.4 Token Billing System (Ledger-Based)

#### Work Description:

Implement **wallet + transaction ledger**

##### Rules:

* 1 token deducted per successful upload
* No deduction if upload fails
* All transactions must be logged

#### Tables:

* wallets
* token_transactions

#### Expected Outcome:

* 100% financial traceability
* Zero reconciliation disputes
* Audit-ready system

---

### 2.5 Review System (Decoupled)

#### Work Description:

* Create separate `reviews` table
* Support multi-level review:

  * L1 (Owner)
  * L3 (Admin)

#### Features:

* Store remarks
* Track timestamps
* Allow multiple review cycles

#### Expected Outcome:

* Full audit trail
* Clear rejection reasoning
* Structured resubmission loop

---

### 2.6 RBAC (Role-Based Access Control)

#### Work Description:

Implement middleware-based RBAC

#### Role Permissions:

| Role | Actions          |
| ---- | ---------------- |
| L0   | Upload documents |
| L1   | Approve/Reject   |
| L3   | Final approval   |
| L5   | Override         |

#### Expected Outcome:

* Secure API access
* Zero unauthorized actions
* Compliance with OWASP standards

---

## 3. AI ENGINE IMPLEMENTATION

---

### 3.1 RAG System (Retrieval Augmented Generation)

#### Work Description:

* Convert documents into embeddings
* Store in vector DB (FAISS or Pinecone)
* Retrieve relevant documents during queries

#### Inputs:

* Approved documents
* IGBC guidelines

#### Outputs:

* Suggested documents
* Context-aware answers

#### Expected Outcome:

* 30–50% reduction in document errors
* Faster user decisions

---

### 3.2 Document Validator

#### Work Description:

Pre-upload validation:

* File type validation
* Naming convention check
* Credit relevance check

#### Expected Outcome:

* Reduced invalid uploads
* Lower rejection rates

---

### 3.3 Rejection Intelligence Engine

#### Work Description:

* Capture rejection reasons
* Store patterns per credit
* Suggest corrections to users

#### Expected Outcome:

* Continuous learning system
* Reduced repeat mistakes

---

### 3.4 Risk Scoring Engine

#### Work Description:

Calculate project risk score using:

* Missing documents
* Rejection frequency
* Delays in workflow

#### Output:

* Risk score per project
* Flag high-risk credits

#### Expected Outcome:

* Predictive insights for clients
* Premium monetization capability

---

## 4. DATABASE IMPLEMENTATION

---

### Must Implement Tables:

* clients
* projects
* credits
* project_credits
* documents
* reviews
* users
* project_users
* wallets
* token_transactions
* embeddings
* rejection_patterns
* activity_logs

---

### Expected Outcome:

* Fully normalized schema
* Supports AI + billing + workflow
* Scales to 10,000+ projects

---

## 5. API LAYER REQUIREMENTS

---

### Must Support:

#### Document APIs:

* Upload document
* Fetch documents by credit
* Version control

#### Review APIs:

* Approve/reject document
* Add remarks

#### Billing APIs:

* Get wallet balance
* Fetch transaction history

#### AI APIs:

* Get document suggestions
* Get project risk score

---

### Expected Outcome:

* Clean REST endpoints
* Role-secured APIs
* Ready for frontend integration

---

## 6. FRONTEND REQUIREMENTS

---

### Must Implement:

#### Role-Based Dashboards:

* L0 → Upload interface
* L1 → Review queue
* L2 → Portfolio dashboard
* L3 → Approval console

---

### AI Copilot Panel:

* Persistent across screens
* Suggest next actions
* Show risk alerts

---

### Expected Outcome:

* Context-aware UI
* Reduced user confusion
* Faster workflow completion

---

## 7. NON-FUNCTIONAL REQUIREMENTS

---

### Performance:

* Async processing for heavy tasks
* API response < 300ms (target)

### Security:

* RBAC enforced at middleware
* Project-level data isolation

### Auditability:

* Every action logged
* Immutable activity logs

---

## 8. SUCCESS METRICS

---

| Metric                  | Target |
| ----------------------- | ------ |
| Document rejection rate | ↓ 40%  |
| Processing time         | ↓ 30%  |
| Token accuracy          | 100%   |
| API error rate          | < 1%   |

---

## 9. DELIVERY CHECKLIST

Before marking complete:

* [ ] Workflow state machine implemented
* [ ] Token ledger active and tested
* [ ] AI validator working
* [ ] RAG system integrated
* [ ] Risk engine functional
* [ ] RBAC enforced
* [ ] Event system operational
* [ ] APIs documented

---

## 10. FINAL NOTE

This is not a feature build.

This is a **platform foundation**.

Every module must be:

* Scalable
* Decoupled
* Audit-safe
* AI-ready

Failure to follow this will result in:

* Rework
* Scaling issues
* Monetization limits

---

**End of Document**
