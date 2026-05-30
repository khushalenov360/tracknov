# Architect Developer Handoff.md

## 1. Objective
Build the Architect (L0) module of Tracknov to enable structured, multi-document mapping per credit with high accuracy and minimal rework.

The system must ensure:
- Clear mapping of documents to credits
- Multi-document handling per credit
- High first-time approval rate
- Reduced token wastage

---

## 2. User Definition
User: Architect (Priya)

- Handles material documentation
- Works with multiple vendors
- Has documents but lacks mapping clarity
- Needs structured, reusable workflow

---

## 3. Core Functional Requirements

### 3.1 Credit-to-Document Mapping Engine
Each credit must define:
- Required document types
- Mandatory vs optional documents
- Clear description of each requirement

Expected Outcome:
- No ambiguity in submission
- Reduced incorrect uploads

---

### 3.2 Multi-Document Upload Structure
- One credit must support multiple documents
- Each upload tagged with document_type

Expected Outcome:
- Structured documentation
- Easier validation

---

### 3.3 Editable Mapping Before Review
Allow user to:
- Edit document
- Move document to another credit
- Delete document

Condition:
Only allowed when status = uploaded

Expected Outcome:
- Prevent token loss
- Clean submission

---

### 3.4 Pre-Submission Validation Checklist
System must display:
- Uploaded documents
- Missing documents
- Completion status per credit

Expected Outcome:
- Improved completeness
- Reduced rejection rate

---

### 3.5 Rejection Feedback System
- Structured rejection categories
- Detailed technical remarks

Expected Outcome:
- Faster corrections
- Reduced back-and-forth

---

### 3.6 Notification System
Trigger notifications on:
- Document rejection
- Document approval

Channels:
- Email / WhatsApp

Expected Outcome:
- No need for constant login

---

### 3.7 Vendor Document Library
- Store reusable vendor documents
- Suggest reuse during upload

Expected Outcome:
- 30–50% effort reduction
- Faster workflow

---

### 3.8 Duplicate Detection System
- Detect duplicate uploads using file hash
- Suggest reuse instead of new upload

Expected Outcome:
- Token efficiency
- Cleaner database

---

### 3.9 Submission Readiness Indicator
- Show completion status of architect scope
- Highlight pending and rejected items

Expected Outcome:
- Clear ownership
- Reduced dependency on L1

---

### 3.10 Contextual Guidance
- Show sample documents
- Highlight common mistakes

Expected Outcome:
- Reduced errors
- Better quality submissions

---

## 4. UX Guidelines
- Structured layout (not generic upload)
- Clear document slots per credit
- Minimal clicks
- Plain language (no IGBC jargon)
- Visible validation indicators

---

## 5. Backend Requirements

### Core Tables
- users
- projects
- credits
- documents
- vendor_documents

---

### Key Fields
credits:
- document_requirements (JSON)
- responsible_role

documents:
- credit_id
- document_type
- status
- version
- rejection_reason

vendor_documents:
- vendor_name
- document_type
- file_url

---

### APIs
- /architect/credits
- /architect/upload
- /architect/documents
- /architect/library
- /architect/notifications

---

## 6. Token Logic
- Deduct token only on successful upload
- No deduction on failed upload
- Refund if deleted before review

---

## 7. Testing Criteria

### Functional
- Multiple documents per credit supported
- Edit/move/delete works before review
- Rejection feedback is clear

### Performance
- Upload <30 sec
- App load <2 sec

### User Acceptance
- User completes mapping without confusion
- No training required

---

## 8. Success Metrics
- First-time approval rate >75%
- Multi-doc completeness >90%
- Reuse rate >30%
- Rejection rate <25%

---

## 9. Final Outcome
Architect should:
- Clearly know what to upload
- Upload all required documents correctly
- Avoid rework and duplication

---

## Final Principle
If the user has to think where a document goes, the system has failed.
