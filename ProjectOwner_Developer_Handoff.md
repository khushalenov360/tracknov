# Project Owner Developer Handoff.md

## 1. Objective
Build the Project Owner (L1) module of Tracknov to enable efficient project control, fast document review, and bottleneck resolution across multiple projects.

The system must ensure:
- Centralized control across projects
- Fast approval/rejection workflow
- Reduced delays
- Clear visibility of progress and risks

---

## 2. User Definition
User: Project Owner (Anita)

- Manages multiple projects
- Not an IGBC expert
- Focused on coordination and approvals
- Needs speed and clarity

---

## 3. Core Functional Requirements

### 3.1 Multi-Project Dashboard
Display:
- Project name
- Completion %
- Pending approvals
- Rejections
- Risk status (Green/Amber/Red)

Expected Outcome:
- Instant project overview
- Quick prioritization

---

### 3.2 Central Review Queue
- Unified list of documents awaiting approval

Each item shows:
- Document preview
- Uploaded by
- Credit name (simple)

Actions:
- Approve
- Reject

Expected Outcome:
- Fast decision-making
- Reduced delays

---

### 3.3 Bulk Approval System
- Multi-select documents
- Approve multiple items at once

Expected Outcome:
- Faster review cycle
- Increased throughput

---

### 3.4 Structured Rejection System
- Predefined rejection templates:
  - Missing information
  - Wrong document
  - Poor quality
  - Custom remark

Expected Outcome:
- Clear communication
- Faster corrections

---

### 3.5 Approval Workflow Control
Flow:
L0 Upload → L1 Approve → L3 Validate

Rules:
- Only approved documents visible to L3
- Strict status transitions

Expected Outcome:
- Reduced consultant workload
- Improved quality control

---

### 3.6 Intelligent Alert System
Triggers:
- Pending approvals
- No activity
- Unresolved rejections

Expected Outcome:
- No manual follow-ups
- Better timelines

---

### 3.7 Token Visibility
Display:
- Remaining tokens
- Usage trend

Expected Outcome:
- Prevent workflow interruption

---

### 3.8 Audit Trail System
Track:
- Upload time
- Approval/rejection
- User actions

Expected Outcome:
- Full transparency
- Accountability

---

### 3.9 Project Drilldown
- View detailed status per project
- Secondary to dashboard

Expected Outcome:
- Focused analysis when needed

---

### 3.10 Mobile Review Support
- Approve/reject via mobile interface

Expected Outcome:
- Faster response time

---

## 4. UX Guidelines
- Dashboard-first design
- Minimal clicks
- Clear visual indicators
- Fast loading (<2 sec)
- Mobile responsive

---

## 5. Backend Requirements

### Core Tables
- users
- projects
- documents
- approvals
- token_transactions

---

### Key Fields
documents:
- status (uploaded, approved, rejected)
- reviewer_id
- rejection_reason

projects:
- completion_percentage
- pending_reviews_count
- risk_status

---

### APIs
- /owner/dashboard
- /owner/review-queue
- /owner/approve
- /owner/reject
- /owner/alerts

---

## 6. Token Logic
- No token deduction during review
- Token only tied to upload or consultant actions

---

## 7. Testing Criteria

### Functional
- Review queue works correctly
- Bulk approval works
- Rejection messages clear

### Performance
- Page load <2 sec
- Actions <1 sec response

### User Acceptance
- User can clear queue efficiently
- No confusion in workflow

---

## 8. Success Metrics
- Avg review time <30 sec/document
- Daily review capacity >40 documents
- Queue backlog <20 items
- Delay reduction >30%

---

## 9. Final Outcome
Project Owner should:
- Open dashboard
- Identify priority projects
- Review and clear documents quickly
- Keep workflow moving

Without:
- Manual follow-ups
- Confusion
- Delays

---

## Final Principle
If the Project Owner has to chase people manually, the system has failed.
