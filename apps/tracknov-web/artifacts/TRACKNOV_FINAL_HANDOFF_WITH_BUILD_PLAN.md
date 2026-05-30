# TRACKNOV – MASTER DEVELOPER HANDOFF (FINAL CONSOLIDATED + BUILD PLAN)

## PRODUCT PURPOSE
Tracknov is a workflow-driven IGBC certification execution system ensuring structured execution, accountability, and compliance.

---

## CORE STRUCTURE
Project → Stage → Credit → Submittal → Document Type → Document → Review → Decision

---

## PROJECT LIFECYCLE
Stages:
1. Design
2. Construction
3. Handover

Rules:
- Cannot start Construction before Design completion
- Cannot enter Handover before Construction completion

---

## ROLES
L5 – Super Admin  
L3 – Project Admin  
L1 – Project Owner  
L0 – Execution Team  
L2 – Client (Read-only)

---

## PROJECT ACCESS
- Project Code generated
- Users join via code
- Access controlled via project_users

---

## CREDIT SYSTEM
- Pre-loaded from rulebook
- Tagged to stage
- Contains submittals and rules

---

## SUBMITTAL SYSTEM
- Multiple document types per submittal
- Mandatory / Optional
- Assigned to specific users

Completion Rule:
All mandatory documents must be approved

---

## DOCUMENT SYSTEM
Lifecycle:
PENDING → UPLOADED → L1 REVIEW → L3 VALIDATION → APPROVED / REJECTED

Rules:
- No deletion
- Versioning mandatory
- New version triggers re-review

---

## REVIEW PIPELINE
L0 → L1 → L3

Rejected documents return only to assigned owner.

---

## DOCUMENT RESPONSIBILITY ASSIGNMENT (CRITICAL)
- L3 assigns each document type to a specific L0 user
- One document type = one owner
- Only assigned user can upload/update
- Rejected documents return to same owner
- Assignment creates tasks automatically

---

## SUBMISSION SYSTEM
Stage-wise:
Design → Construction → Handover

Only approved latest documents included.

---

## DASHBOARD

L1:
- Pending Upload
- Pending Review
- Pending Validation
- Rejected
- Credit-wise breakdown

L2:
- % Completion
- Credits completed
- Stage progress

---

## TASK ENGINE
System-generated tasks:
- Upload
- Review
- Validate
- Fix

---

## REVIEWER SIMULATION
Manual trigger: “Run Check”

Checks:
- Completeness
- Consistency
- Compliance

Blocks submission if errors exist.

---

## RULEBOOK ENGINE
- AI generates rules
- Admin validates
- Version controlled
- Projects lock to version

---

## SYSTEM RULES
- No deletion
- No workflow skipping
- Versioning mandatory
- Full audit logging
- Role-based enforcement

---

## ACCEPTANCE CRITERIA
- Workflow enforced
- Role mapping working
- Submittal logic correct
- Document versioning working
- Stage submission working
- Rulebook validation active

---

# 🚀 BUILD PLAN (MANDATORY EXECUTION ORDER)

## PHASE 1 – FOUNDATION (DO FIRST)
1. User authentication system
2. Project creation + project_code generation
3. project_users mapping (access control)
4. Role enforcement (L0–L5)

👉 Output: Users can log in and access assigned projects

---

## PHASE 2 – CORE STRUCTURE
5. Project → Stage → Credit mapping
6. Credit loading from rulebook
7. Submittal + Document Type structure

👉 Output: Project structure visible

---

## PHASE 3 – DOCUMENT ENGINE
8. Document upload (mapped to document type)
9. Versioning system
10. Ownership enforcement (only assigned user can upload)

👉 Output: Controlled document system

---

## PHASE 4 – REVIEW PIPELINE
11. L1 review layer
12. L3 validation layer
13. State transitions enforcement

👉 Output: End-to-end workflow functional

---

## PHASE 5 – TASK ENGINE (AUTO)
14. Auto task generation
15. Task visibility per role

👉 Output: Users see actionable work

---

## PHASE 6 – DASHBOARD
16. L1 dashboard (counts + credit breakdown)
17. L2 dashboard (summary view)

👉 Output: Visibility layer active

---

## PHASE 7 – STAGE SYSTEM
18. Stage gating (Design → Construction → Handover)
19. Stage-wise submission packs

👉 Output: Lifecycle enforced

---

## PHASE 8 – REVIEWER SIMULATION
20. Run Check button
21. Rule-based validation engine

👉 Output: Pre-validation working

---

## PHASE 9 – RULEBOOK ENGINE
22. AI extraction (draft)
23. Admin validation UI
24. Version locking

👉 Output: Scalable rule system

---

## FINAL NOTE
Do NOT build everything together.
Build phase-by-phase strictly in this order.

Tracknov is a workflow engine, not a file storage system.
