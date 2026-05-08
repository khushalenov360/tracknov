# Project Admin Developer Handoff.md

## 1. Objective
Build the Project Admin (L3) module of Tracknov to enable high-speed validation, cross-project control, and automated submission preparation.

The system must ensure:
- Fast document validation (<10 sec per document)
- Cross-project visibility
- Minimal repetitive work
- Accurate and ready-to-submit documentation packs

---

## 2. User Definition
User: Project Admin (Arjun)

- IGBC domain expert
- Handles multiple projects simultaneously
- Focused on validation and submission
- High-value resource (efficiency critical)

---

## 3. Core Functional Requirements

### 3.1 Cross-Project Dashboard
Display:
- Project name
- Completion %
- Pending validations
- Rejections
- Submission readiness

Expected Outcome:
- Prioritization across projects
- No blind spots

---

### 3.2 High-Speed Validation Queue
- Unified queue for all documents

Each item shows:
- Document preview
- Requirement summary
- Uploaded by
- Version history

Actions:
- Approve
- Reject

Expected Outcome:
- <60 sec validation time
- High throughput

---

### 3.3 Rejection Template Library
- Predefined rejection reasons
- Editable before submission

Expected Outcome:
- Reduced typing effort (40–60%)
- Consistency in feedback

---

### 3.4 Submission Pack Generator
- One-click ZIP export
- Organized by credit/category
- Correct file naming

Expected Outcome:
- Save 3–6 hours per project
- IGBC-ready output

---

### 3.5 Submission Readiness Validator
System must verify:
- All required documents uploaded
- All documents approved
- No pending/rejected items

Expected Outcome:
- Zero submission errors

---

### 3.6 Token Management
- View token balance
- Load tokens
- View transaction history

Expected Outcome:
- Smooth financial operations

---

### 3.7 Session Logger
- Log consulting sessions quickly

Fields:
- Duration
- Project
- Notes (optional)

Expected Outcome:
- Accurate billing
- Minimal effort

---

### 3.8 Performance Analytics
Display:
- Documents reviewed/day
- Approval rate
- Rejection rate

Expected Outcome:
- Efficiency tracking
- Continuous improvement

---

### 3.9 Audit Trail System
Track:
- Upload
- Approval
- Rejection
- Resubmission

Expected Outcome:
- Full transparency
- Dispute resolution

---

### 3.10 Knowledge Capture System
- Identify repeated rejection patterns
- Convert into system guidance

Expected Outcome:
- Reduced future errors
- Improved L0 performance

---

## 4. UX Guidelines
- Fast loading (<1 sec per action)
- Minimal clicks
- Inline validation workflow
- Keyboard shortcuts (optional)
- Clean and efficient UI

---

## 5. Backend Requirements

### Core Tables
- projects
- documents
- validations
- token_transactions
- sessions
- rejection_templates

---

### Key Fields
documents:
- status (approved, rejected)
- reviewer_id
- version
- rejection_reason

projects:
- completion_percentage
- validation_pending_count
- submission_ready_flag

rejection_templates:
- template_name
- message
- category

---

### APIs
- /admin/dashboard
- /admin/validation-queue
- /admin/approve
- /admin/reject
- /admin/submission-pack
- /admin/tokens
- /admin/sessions

---

## 6. Token Logic
- Tokens consumed on:
  - Upload
  - Consulting session
- Full traceability required

---

## 7. Testing Criteria

### Functional
- Validation queue works correctly
- Submission pack generated correctly
- Templates function properly

### Performance
- Document load <1 sec
- Action response <1 sec

### User Acceptance
- Consultant can process >80 docs/day
- No friction in workflow

---

## 8. Success Metrics
- Docs reviewed/day: 80–120
- Avg validation time: <10 sec
- First-pass approval: >70%
- Submission prep time: <10 min

---

## 9. Final Outcome
Project Admin should:
- Manage all projects from one screen
- Validate documents rapidly
- Generate submission packs instantly

Without:
- Manual repetition
- Delays
- Errors

---

## Final Principle
If the consultant is still doing repetitive manual work, the system has failed.
