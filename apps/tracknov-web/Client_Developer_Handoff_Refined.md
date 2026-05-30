# Client Developer Handoff.md (Refined)

## 1. Objective
Build the Client (L2) module of Tracknov to provide executive-level visibility into certification progress, cost, and risk.

The system must enable the client to:
- Understand status in <30 seconds
- Track token usage clearly
- Identify risks early
- Make decisions without operational involvement

---

## 2. User Definition
User: Client (Vikram)

- Senior stakeholder
- Not involved in daily operations
- Logs in occasionally (weekly)
- Focused on outcome, cost, and risk

---

## 3. Core Functional Requirements

### 3.1 Executive Dashboard (Mandatory)
Display:
- Overall completion %
- Target rating
- Active projects count
- Projects at risk
- Token balance

Expected Outcome:
- Instant clarity without navigation

---

### 3.2 Project Risk Engine
Inputs:
- Pending items
- Rejections
- Inactivity

Output:
- On Track / Delay Risk / Critical

Expected Outcome:
- Early intervention
- No surprises

---

### 3.3 Token Wallet Visibility
Display:
- Tokens loaded
- Tokens used
- Tokens remaining
- Consumption trend

Expected Outcome:
- Full cost transparency
- Zero disputes

---

### 3.4 Efficiency Metrics
Display:
- Rejection rate
- Tokens per project
- First-time approval rate

Expected Outcome:
- Performance evaluation
- Cost optimization

---

### 3.5 Project-Level View
Display:
- Completion %
- Pending items
- Rejections

Restrictions:
- No document-level visibility
- No internal remarks

Expected Outcome:
- Clean, distraction-free interface

---

### 3.6 Reporting System
- Generate downloadable PDF summary

Includes:
- Status
- Risk
- Token usage

Expected Outcome:
- Easy internal sharing

---

### 3.7 Alert System
Triggers:
- Project risk
- Low tokens

Expected Outcome:
- Actionable notifications only

---

### 3.8 Forecasting Engine
Display:
- Estimated completion time
- Projected rating

Expected Outcome:
- Planning clarity

---

### 3.9 Portfolio Overview
Display:
- Total projects
- Completed
- In progress
- Delayed

Expected Outcome:
- Portfolio-level visibility

---

## 4. UX Guidelines
- Single screen focus
- No IGBC terminology
- Minimal clicks (1–2 max)
- Clean UI
- Load time <2 sec

---

## 5. Backend Requirements

### Core Tables
- clients
- projects
- token_wallet
- token_transactions
- project_metrics

---

### APIs
- /client/dashboard
- /client/projects
- /client/tokens
- /client/metrics
- /client/reports

---

## 6. Token Logic
- Real-time updates
- No hidden deductions
- Fully traceable transactions

---

## 7. Testing Criteria

### Functional
- Dashboard accuracy
- Token correctness
- Risk calculation accuracy

### Performance
- Load <2 sec

### User Acceptance
- Client understands status in <30 sec
- No training required

---

## 8. Success Metrics
- Dashboard comprehension <30 sec
- Session time <2 min
- Weekly usage
- High decision usefulness

---

## 9. Final Outcome
Client should:
- Open app
- Understand everything instantly
- Identify risks
- Track cost

Without:
- Navigating multiple screens
- Asking for updates

---

## Final Principle
If the client needs to explore the system to understand status, the system has failed.
