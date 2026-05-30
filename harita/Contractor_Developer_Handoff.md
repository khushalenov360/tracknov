# Contractor Developer Handoff.md

## 1. Objective
Build the Contractor (L0) module of Tracknov to enable ultra-simple, fast, and reliable document uploads from site with minimal user effort.

The system must ensure:
- Camera-first uploads
- <30 second upload flow
- Zero confusion (plain language)
- High success rate even with poor internet
- Minimal dependency on training

---

## 2. User Definition
User: Contractor (Suresh)

- Low technical proficiency
- Works primarily on-site
- Uses mobile devices
- Handles photos, registers, invoices
- May delegate uploads to site admin

---

## 3. Core Functional Requirements

### 3.1 Camera-First Upload System
- Direct camera integration
- Capture photo within app
- No dependency on file browsing

Expected Outcome:
- Seamless on-site usage
- High adoption

---

### 3.2 3-Step Upload Flow
Upload must follow:
1. Select task
2. Capture/upload file
3. Submit

Constraints:
- No forms
- No complex inputs

Expected Outcome:
- <30 seconds per upload
- Minimal friction

---

### 3.3 Plain Language Interface
- Replace IGBC terms with simple descriptions
- Example:
  "Upload Waste Disposal Record" instead of technical credit names

Expected Outcome:
- Zero confusion
- No training required

---

### 3.4 Upload Confirmation System
- Persistent confirmation after upload
- Display:
  ✔ Upload Successful
  📄 File name

Expected Outcome:
- User confidence
- Avoid duplicate uploads

---

### 3.5 Offline + Retry System
- Store uploads locally if network fails
- Retry automatically when connection restores

Technical:
- IndexedDB or equivalent
- Upload queue with status indicators

Expected Outcome:
- No data loss
- Reliable uploads in poor network conditions

---

### 3.6 Rejection Feedback System
- Short, clear, actionable messages
- Example:
  "Photo unclear – upload clearer image"

Constraints:
- No technical language
- No long explanations

Expected Outcome:
- Immediate correction
- Reduced support dependency

---

### 3.7 My Uploads Tracker
Display user uploads:
- ✔ Approved
- ⏳ Pending
- ❌ Rejected

Expected Outcome:
- Visibility of progress
- Accountability

---

### 3.8 Authentication System
- OTP / Magic link login
- No password dependency

Expected Outcome:
- Higher adoption
- Reduced login friction

---

### 3.9 Task-Based Dashboard
- Show assigned tasks directly
- Example:
  "Upload Waste Photo"

Constraints:
- No navigation required
- No credit browsing

Expected Outcome:
- Faster onboarding
- Zero confusion

---

### 3.10 Error Prevention System
- Pre-upload confirmation:
  Show project + task before submission
- Basic validation:
  Prevent obvious mistakes

Expected Outcome:
- Reduced errors
- Token savings

---

## 4. UX Guidelines
- Mobile-first design
- Maximum 3 steps per task
- Large buttons and simple UI
- No IGBC terminology
- Clear visual feedback
- Persistent status indicators

---

## 5. Backend Requirements

### Core Tables
- users
- projects
- tasks
- documents
- token_transactions

---

### Key Fields
tasks:
- display_name_l0
- assigned_role

documents:
- status (uploaded, rejected, approved)
- rejection_reason
- file_url

---

### APIs
- /contractor/tasks
- /contractor/upload
- /contractor/documents
- /contractor/notifications

---

## 6. Token Logic
- Deduct token only on successful upload
- No deduction on failed upload
- Refund if deleted before review

---

## 7. Testing Criteria

### Functional
- Camera upload works
- Offline retry works
- Plain language visible
- Task-based flow functional

### Performance
- Upload <30 sec
- App load <2 sec

### User Acceptance
- User completes task without training
- No confusion in navigation

---

## 8. Success Metrics
- Upload success rate >95%
- Avg upload time <30 sec
- Rejection rate <20%
- Mobile usage >85%

---

## 9. Final Outcome
Contractor should:
- Open app
- See task
- Upload instantly
- Receive confirmation

Without:
- Training
- Technical understanding
- Repeated attempts

---

## Final Principle
If this module is harder than sending a photo on WhatsApp, it has failed.
