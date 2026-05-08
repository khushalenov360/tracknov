# Token Engine Developer Handoff.md

## 1. Objective
Build the Token Engine for Tracknov to enable accurate, transparent, and fully traceable consumption of tokens across uploads and consulting sessions.

This module is the **revenue backbone** of the platform.

The system must ensure:
- 100% transaction accuracy
- No unintended token loss
- Full auditability
- Real-time balance visibility

---

## 2. Core Principles

1. Tokens represent billable actions
2. Every deduction must be traceable
3. No silent failures allowed
4. Refund logic must be deterministic
5. System must be dispute-proof

---

## 3. Token Usage Events

### 3.1 Upload Event
- Trigger: Successful document upload
- Deduction: 1 token (configurable)

Rule:
- Deduct ONLY after successful upload confirmation

---

### 3.2 Consulting Session
- Trigger: Session logged by L3
- Deduction: Based on duration (e.g., 50 tokens/hour)

---

### 3.3 Refund Event
- Trigger: Document deleted before review

Rule:
- Refund only if status = "uploaded"
- No refund after approval/review

---

## 4. Token Flow Logic

```plaintext
Upload Initiated → Upload Success → Deduct Token → Record Transaction
Upload Failed → No Deduction
Delete Before Review → Refund Token
Approved → Locked (No Refund)
```

---

## 5. Core Tables

### 5.1 token_wallet

Fields:
- id
- client_id
- balance
- last_updated

---

### 5.2 token_transactions

Fields:
- id
- client_id
- project_id
- user_id
- type (upload / session / refund / manual)
- amount (+/-)
- reference_id (document/session)
- timestamp

---

## 6. API Endpoints

- GET /tokens/balance
- GET /tokens/transactions
- POST /tokens/deduct
- POST /tokens/refund
- POST /tokens/load

---

## 7. Transaction Rules

- All operations must be atomic
- Use database transactions
- Prevent double deduction
- Idempotent API design

---

## 8. Edge Case Handling

### Case 1: Upload Failure
- No deduction

### Case 2: Duplicate Upload
- Detect via hash
- Suggest reuse (no token)

### Case 3: Network Drop During Upload
- Deduct only after confirmation

### Case 4: Manual Override (L5)
- Allowed with audit log

---

## 9. Audit & Traceability

Every transaction must log:
- Who triggered it
- When
- Why
- Linked entity (document/session)

---

## 10. UI Requirements

Display:
- Total tokens loaded
- Tokens used
- Remaining balance
- Usage trend

---

## 11. Testing Criteria

### Functional
- Correct deduction on upload
- Refund works correctly
- No double transactions

### Performance
- Transaction <1 sec

### Integrity
- Balance always matches transaction sum

---

## 12. Success Metrics

- Token accuracy: 100%
- Disputes: 0
- Transaction latency: <1 sec

---

## 13. Final Outcome

The token system should:
- Be invisible during normal use
- Be fully trusted during disputes
- Support scalable revenue tracking

---

## Final Principle

If a client questions token accuracy, the system has failed.
