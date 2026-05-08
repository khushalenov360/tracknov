# UX/UI Developer Handoff — Tracknov

## 1. Objective

Design and implement a **role-driven, workflow-centric UI** for Tracknov focused on:

* IGBC project execution
* Credit-level tracking
* Document-driven compliance
* Clear consultant vs client experience

---

## 2. Product Definition (Locked Scope)

Tracknov is:

> A **green building certification workflow management system**

Tracknov is NOT:

* ESG platform
* Carbon credit system
* Tokenization product

---

## 3. Core UX Philosophy

* **Workflow-first UI (not page-first)**
* **Minimum clicks to action**
* **State-driven interfaces**
* **Role-based rendering (Consultant vs Client)**

---

## 4. Core Entities (Must reflect in DB + UI)

| Entity   | Purpose                     |
| -------- | --------------------------- |
| Project  | Container for certification |
| Credit   | Execution unit              |
| Document | Proof layer                 |
| User     | Role-based access           |
| Task     | Action tracking             |

---

## 5. Global Navigation (Mandatory)

Top Nav:

* Dashboard
* Projects
* Credits
* Documents
* Tasks

---

## 6. Screen Definitions

### SCREEN: Dashboard

* Actions: View projects, create project, view alerts
* Key Fields:

  * Project list
  * % completion
  * Pending credits
  * Risk flags

---

### SCREEN: Create Project

* Actions: Create, configure IGBC system, assign users
* Key Fields:

  * Project name
  * Rating system
  * Location
  * Team members

---

### SCREEN: Project Overview

* Actions: Navigate modules, edit project
* Key Fields:

  * Progress %
  * Credit summary
  * Activity log

---

### SCREEN: Credits List

* Actions: Filter, assign, open credit
* Key Fields:

  * Credit name
  * Status
  * Assignee
  * Deadline

---

### SCREEN: Credit Detail (CORE)

* Actions:

  * Upload documents
  * Change status
  * Assign user
  * Comment
  * Submit

* Key Fields:

  * Credit description
  * Status
  * Required documents
  * Activity timeline

---

### SCREEN: Documents

* Actions: Upload, tag, version control
* Key Fields:

  * File name
  * Linked project
  * Linked credit
  * Version
  * Status

---

### SCREEN: Tasks

* Actions: Create, assign, update
* Key Fields:

  * Task name
  * Linked credit
  * Assignee
  * Due date

---

### SCREEN: Submission / Review

* Actions: Submit, resubmit
* Key Fields:

  * Submission status
  * Reviewer comments
  * Timestamps

---

### SCREEN: User Management

* Actions: Add/edit users, assign roles
* Key Fields:

  * Name
  * Role (Consultant / Client)
  * Permissions

---

## 7. Role-Based UX Rules

### Consultant

* Full CRUD access
* Dense UI (tables, filters)
* Workflow control

### Client

* Read-only mostly
* Visual dashboards
* No editing of credits/documents

---

## 8. Workflow Engine (Critical)

### Credit Lifecycle States:

1. Not Started
2. In Progress
3. Ready for Submission
4. Submitted
5. Review Failed
6. Approved

### Rules:

* Only “Ready for Submission” → can Submit
* “Submitted” → locked (except comments)
* “Review Failed” → reopens editing
* “Approved” → final lock

---

## 9. UX Flow (Primary)

### Flow 1:

Dashboard → Create Project → Project Overview

### Flow 2:

Project → Credits List → Credit Detail

### Flow 3:

Credit Detail → Upload Docs → Mark Ready → Submit

### Flow 4:

Dashboard → Risk → Drill into Credit

---

## 10. Component Architecture (Fix Required)

Refactor:

```
components/
 ├── project/
 ├── credit/
 ├── document/
 ├── task/
 ├── shared/
```

Avoid generic dumping.

---

## 11. State-Driven UI (Mandatory)

UI must change based on:

* Credit status
* User role

Example:

* Approved → disable inputs
* Submitted → show review state
* Client → hide edit buttons

---

## 12. Non-Negotiables

* No screen without clear action
* No duplicate navigation paths
* No mixed role UI
* No feature without workflow mapping

---

## 13. Expected Outcome

After implementation:

### Product Level

* Clear user journeys
* Reduced confusion
* Faster onboarding (<1 hour)

### Consultant Experience

* 30–50% faster execution vs Excel

### Client Experience

* Instant visibility (≤10 sec understanding)

### System Capability

* Audit-ready workflow
* Scalable architecture for future modules

---

## 14. Definition of Done

Feature is complete only if:

* UI matches workflow
* Role-based rendering works
* State transitions enforced
* No dead-end screens

---

## 15. Immediate Priority (Execution Order)

1. Project Flow
2. Credit Flow
3. Document Linking
4. Submission System
5. Dashboard

---

END OF DOCUMENT
