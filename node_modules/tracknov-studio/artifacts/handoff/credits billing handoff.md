# Tracknov – Credits Billing System (Client Wallet Model)

## Developer Handoff Document

---

# 1. OBJECTIVE

Design and implement a **client-based credit billing system** where:

* Credits are owned by the **client (organization)**
* All projects under the client consume from a **single shared wallet**
* Credits are **deducted immediately upon action**
* Failed actions are **auto-refunded**
* Every transaction is **traceable and auditable**

---

# 2. CORE PRINCIPLE

> **Credits belong to CLIENT → consumed by PROJECTS → triggered by USERS**

---

# 3. SYSTEM ARCHITECTURE

```text
Client Wallet
   ↓
Transaction Ledger (immutable)
   ↓
Action Engine (deduction + execution)
   ↓
Projects & Users (consumption layer)
```

---

# 4. DATA MODEL (LOGICAL STRUCTURE)

---

## 4.1 Client Wallet

Each client must have a single wallet:

* Total Credits Added
* Credits Used
* Credits Refunded
* Current Balance

---

## 4.2 Transaction Ledger (MANDATORY)

Every credit movement must be recorded.

### Fields:

* transaction_id
* client_id
* project_id
* user_id
* action_type
* credits (negative or positive)
* status (processing / completed / failed / refunded)
* reference_id (file / credit / action)
* timestamp

---

## 4.3 Project Usage (Derived Data)

* Total credits consumed per project
* No separate wallet per project

---

# 5. CREDIT FLOW (EXECUTION LOGIC)

---

## STEP 1: PRE-CHECK

Before action:

* Check if client balance ≥ required credits
* If not → block action

---

## STEP 2: IMMEDIATE DEDUCTION

* Deduct credits instantly
* Create transaction with status = "processing"

---

## STEP 3: ACTION EXECUTION

* AI / validation / system process runs

---

## STEP 4: FINALIZATION

### If SUCCESS:

* Transaction → "completed"
* Deduction remains

---

### If FAILURE:

* Transaction → "failed"
* Create refund entry
* Restore credits

---

# 6. CREDIT CONSUMPTION RULES

---

## Chargeable Actions

| Action                     | Credits |
| -------------------------- | ------- |
| Document upload + analysis | 1       |
| Smart comparison           | 3       |
| Deep validation            | 2       |
| Copilot advanced query     | 1       |

---

## Non-Chargeable Actions

* Viewing data
* Navigation
* Project creation
* Manual selection
* Rule validation (non-AI)

---

# 7. SAFEGUARDS (NON-NEGOTIABLE)

---

## 7.1 Auto Refund

* Any failed action must refund credits immediately

---

## 7.2 No Duplicate Charges

* Same file (hash match) → no re-charge
* Cached result must be reused

---

## 7.3 No Partial Charges

* If action incomplete → full refund

---

## 7.4 Double Click Protection

* Prevent duplicate transactions

---

## 7.5 Real-time Balance Enforcement

* No negative balance allowed

---

# 8. USER EXPERIENCE REQUIREMENTS

---

## Before Action

Display:

"This action will use X credits"

---

## After Action

### Success:

"X credits used • Result ready"

### Failure:

"Action failed • X credits refunded"

---

## Dashboard Display

* Client Credits Remaining
* Recent Transactions
* Project-wise usage

---

# 9. CLIENT VISIBILITY

---

## Must Provide:

### A. Wallet Summary

* Total credits
* Used
* Remaining

---

### B. Transaction History

| Time | Project | Action | Credits | Status |

---

### C. Project Usage

* Credits consumed per project

---

# 10. ADMIN (SUPER USER) CONTROLS

---

## Must Support:

* Add credits to client wallet
* View full ledger
* Manual refunds (creates audit record)
* Monitor usage trends

---

## Restrictions:

* No direct balance overwrite
* All changes must go through ledger

---

# 11. EDGE CASE HANDLING

---

## Case 1: AI Timeout

→ Auto-refund

---

## Case 2: System Crash

→ Transaction marked failed → refund

---

## Case 3: Duplicate Upload

→ No charge

---

## Case 4: Insufficient Credits

→ Block action before execution

---

# 12. AUDIT & COMPLIANCE

---

System must ensure:

* Every credit movement is logged
* No hidden deductions
* Full traceability per action
* Immutable transaction history

---

# 13. PERFORMANCE REQUIREMENTS

---

* Deduction + validation must be near real-time
* Refund must be immediate
* Ledger queries must be optimized

---

# 14. FUTURE EXTENSIONS (NOT IN MVP)

---

* Project-level budget caps
* Role-based credit limits
* Subscription plans
* Auto top-up
* Billing integration

---

# 15. FINAL SYSTEM BEHAVIOR

---

```text
User triggers action
→ System checks balance
→ Deducts credits
→ Executes action
→ Success → finalize
→ Failure → refund
```

---

# 16. FINAL PRINCIPLE

> **Billing system must feel fair, predictable, and transparent at all times**

---

**End of Document**
