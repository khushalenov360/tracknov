# MEPCON Developer Handoff.md

## 1. Objective
Build the MEP Consultant (L0) module of Tracknov to enable fast, accurate, and mobile-first document submission with minimal friction.

The system must allow MEP users to:
- Know exactly what to upload
- Upload within 30 seconds
- Receive clear feedback
- Avoid token loss due to mistakes

---

## 2. User Definition
User: MEP Consultant (Rajan)

- Works on multiple projects
- Not interested in IGBC theory
- Operates primarily from mobile
- Wants speed and clarity

---

## 3. Core Functional Requirements

### 3.1 Role-Based Credit Filtering
- Show only MEP-related credits
- Auto-filter based on user role
- No manual filtering required

Expected Outcome:
- Reduced cognitive load
- Faster navigation

---

### 3.2 Document Requirement Engine
Each credit must include:
- Document name
- Issuing authority
- Mandatory fields
- Accepted format
- Sample reference

Expected Outcome:
- Higher first-time accuracy
- Reduced rejections

---

### 3.3 Mobile-First Upload System
- Camera integration
- Direct photo capture
- Auto-compression (<1MB)
- Upload progress indicator

Expected Outcome:
- High usability on-site
- >95% upload success rate

---

### 3.4 Fast Upload Flow
- Max 3 steps:
  1. Select credit
  2. Upload
  3. Confirm

Expected Outcome:
- <30 second upload time

---

### 3.5 Rejection Feedback System
- Structured rejection messages
- Must include:
  - What is wrong
  - What needs to be fixed

Expected Outcome:
- Faster resubmissions
- Reduced dependency on consultants

---

### 3.6 Progress Tracker
Display:
- Total assigned credits
- Uploaded count
- Pending count

Expected Outcome:
- Self-monitoring
- No follow-up required

---

### 3.7 Notification System
Triggers:
- Document rejected
- All uploads completed

Channels:
- Email / WhatsApp

Expected Outcome:
- No need for daily login

---

### 3.8 Pre-Upload Validation & Protection
- Confirmation before upload
- Allow edit/delete before review
- Token refund if deleted before review

Expected Outcome:
- Prevent token loss
- Increase trust

---

### 3.9 Authentication
- Magic link OR Google login
- No password dependency

Expected Outcome:
- Increased adoption

---

### 3.10 Task-Based Dashboard
- “My Tasks” view
- Shows:
  - Pending uploads
  - Rejected items
  - Completed items

Expected Outcome:
- No navigation confusion
- Zero training required

---

## 4. UX Guidelines
- Mobile-first design
- Max 3 steps per action
- Plain language (no IGBC jargon)
- Clear visual confirmations
- Persistent success indicators

---

## 5. Backend Requirements

### Core Tables
- users
- projects
- credits
- documents
- token_transactions

---

### Key Fields
credits:
- responsible_role
- what_to_submit
- must_contain
- acceptable_format
- sample_document_url

documents:
- status (uploaded, rejected, approved)
- rejection_reason
- version

---

### APIs
- /mep/tasks
- /mep/upload
- /mep/documents
- /mep/notifications

---

## 6. Token Logic
- Deduct token ONLY on successful upload
- No deduction on failed upload
- Refund if document deleted before review

---

## 7. Testing Criteria

### Functional
- Only MEP credits visible
- Upload works from mobile
- Rejection feedback clear

### Performance
- Upload time <30 sec
- App loads <2 sec

### User Acceptance
- User completes task without training
- No confusion in workflow

---

## 8. Success Metrics

- First-time approval rate >70%
- Upload success rate >95%
- Avg upload time <30 sec
- Rejection rate <25%

---

## 9. Final Outcome

The MEP Consultant should:
- Open the app
- Immediately see what to do
- Upload documents quickly
- Receive clear feedback

Without needing:
- Training
- Consultant support
- Multiple attempts

---

## Final Principle

If this module takes longer than WhatsApp-based sharing, it has failed.
