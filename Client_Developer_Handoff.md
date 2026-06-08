# Client Developer Handoff.md

## 1. Objective
Build a client-facing layer of Tracknov that provides:
- Real-time certification progress visibility
- Transparent token usage
- Risk alerts and actionable insights
- Confidence in certification readiness

The client should understand project status in <30 seconds.

---

## 2. User Definition
Primary User: Client (Organization stakeholder)
- Non-technical
- Not IGBC expert
- Uses platform occasionally (weekly)
- Focused on outcomes, not processes

---

## 3. Core Functional Modules

### 3.1 Executive Dashboard
Display:
- Overall completion %
- Target rating
- Active projects
- Projects at risk
- Token balance

Expected Outcome:
- Instant clarity without navigation

---

### 3.2 Project Risk Engine
Inputs:
- Pending uploads
- Rejections
- Inactivity
- Token balance

Outputs:
- On Track / Delay Risk / Critical

Expected Outcome:
- Early intervention

---

### 3.3 Token Wallet
Display:
- Tokens loaded
- Tokens used
- Tokens remaining
- Weekly usage

Expected Outcome:
- Zero disputes, full transparency

---

### 3.4 Efficiency Metrics
Metrics:
- Rejection rate
- Avg tokens/project
- First-pass approval rate

Expected Outcome:
- Performance visibility

---

### 3.5 Project Drilldown
Allowed:
- Completion %
- Pending
- Rejections

Restricted:
- No document-level view

Expected Outcome:
- Clean interface

---

### 3.6 Reports
- Downloadable PDF
- Project status + risk + tokens

Expected Outcome:
- Easy internal sharing

---

### 3.7 Alerts
Triggers:
- Project risk
- Low tokens
- Milestones

Expected Outcome:
- Actionable notifications only

---

### 3.8 Forecasting
Outputs:
- Estimated completion
- Projected rating

Expected Outcome:
- Planning confidence

---

### 3.9 Portfolio Overview
Display:
- Total projects
- Completed
- In progress
- Delayed

Expected Outcome:
- Portfolio-level control

---

## 4. UX Guidelines
- Max 1–2 clicks
- No IGBC jargon
- Color coding (Green/Amber/Red)
- Load time <2 sec
- Mobile responsive

---

## 5. Backend Requirements
Core Tables:
- clients
- projects
- tokens_wallet
- token_transactions
- project_metrics

APIs:
- /client/dashboard
- /client/projects
- /client/tokens
- /client/metrics
- /client/reports
- /client/alerts

---

## 6. Testing Criteria
- Dashboard accuracy
- Token consistency
- Risk correctness
- Load performance <2 sec
- No training required

---

## 7. Final Outcome
Client should:
- Understand status instantly
- Identify risks
- Track tokens
- Generate reports

Success Definition:
Tracknov becomes the primary control system replacing Excel and manual follow-ups.
