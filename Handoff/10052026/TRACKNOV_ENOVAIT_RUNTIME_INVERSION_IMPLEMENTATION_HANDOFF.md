
# TRACKNOV — ENOVAIT RUNTIME INVERSION IMPLEMENTATION HANDOFF

## PURPOSE

Transform Tracknov Copilot from:
- workflow-first AI

into:
- conversation-first governed intelligence

The final experience must feel like:
- EnovAIT
- ChatGPT-style conversational intelligence
- senior IGBC consultant
- workflow-aware operational copilot

WITHOUT:
- losing governance
- losing RBAC enforcement
- losing audit integrity
- losing workflow safety

---

# CURRENT CORE PROBLEM

Current runtime behaves like:

User
→ Governance
→ Workflow
→ Validation
→ AI
→ Response

This causes:
- robotic replies
- upload confirmation spam
- workflow hijacking
- broken conversational continuity
- poor contextual reasoning

---

# REQUIRED TARGET ARCHITECTURE

User
→ Conversational AI
→ Intent Understanding
→ Context Retrieval
→ Silent Tool Routing
→ Governance Layer (only if required)
→ Response

This inversion is mandatory.

---

# IMPLEMENTATION REQUIREMENTS

## 1. CONVERSATIONAL-FIRST RUNTIME

The AI must:
- understand intent first
- converse naturally first
- trigger workflows only when explicitly needed

Current tool-trigger-first behavior is forbidden.

---

## 2. CONVERSATION MEMORY ENGINE

Developer must implement persistent session memory.

The system must remember:
- active project
- active file
- active credit
- current workflow stage
- recent discussion
- previous analysis
- unresolved blockers
- current user objective

The AI must stop behaving stateless.

---

## 3. ATTACHMENT CONTEXT ENGINE

Developer must separate:

A. Conversational Attachments
B. Workflow Uploads

These are separate pipelines.

### Conversational Attachments
Used for:
- summaries
- explanations
- comparisons
- analysis
- gap identification

Must NOT:
- mutate workflows
- upload officially
- map automatically

### Workflow Uploads
Only triggered by explicit commands:
- Upload this
- Map this to EDA C1
- Submit this

Must require:
- governance checks
- validation
- audit logging

---

## 4. INTENT HIERARCHY ENGINE

Developer must implement intent classification.

Mandatory intent classes:
- conversational
- analytical
- exploratory
- operational
- workflow
- administrative

Current keyword-trigger logic is insufficient.

---

## 5. SILENT TOOL ORCHESTRATION

The user must NEVER feel backend orchestration.

The AI should:
- silently retrieve context
- silently use tools
- silently fetch workflow state

WITHOUT narrating internal mechanics.

Forbidden:
- workflow routing narration
- execution narration
- governance narration
- AI orchestration exposure

---

## 6. RESPONSE NORMALIZATION

Responses must:
- feel natural
- feel contextual
- remain concise
- remain operationally useful

Responses must NOT:
- expose orchestration
- expose RAG behavior
- expose governance internals
- expose workflow mechanics unnecessarily

---

## 7. PROJECT OPERATIONAL MEMORY

The AI must know:
- current blockers
- pending uploads
- unresolved reviews
- current credit status
- latest project actions

without users repeatedly re-explaining context.

---

## 8. ENOVAIT MODELING REQUIREMENT

Tracknov must inherit:
- conversational flow
- memory continuity
- contextual carry-forward
- intelligent follow-up behavior
- human-like interaction

Tracknov must NOT inherit:
- unrestricted assumptions
- hallucination tolerance
- freeform unsafe answering

---

## 9. GOVERNANCE POSITIONING

Governance must become:
- invisible during conversation
- active only during mutations

The user should talk to:
ONE intelligent consultant

NOT:
- workflows
- state machines
- orchestrators
- governance systems

---

## 10. REQUIRED AI PERSONALITY

Tracknov Copilot should consistently behave like:
- senior IGBC consultant
- Tracknov product expert
- intelligent operations advisor

Identity switching behavior is forbidden.

---

## 11. REQUIRED RESPONSE EXAMPLES

GOOD:
“EDA C1 is blocked because the HVAC efficiency declaration is still pending.”

BAD:
“I can inspect workflow states if you confirm execution.”

---

## 12. REQUIRED TESTS

Developer must prove:
- conversational continuity
- attachment continuity
- workflow separation
- correct intent routing
- silent orchestration
- RBAC-safe retrieval
- no workflow hijacking
- no upload confirmation spam
- project isolation integrity

---

## 13. PRODUCTION BLOCKERS

DO NOT DEPLOY if:
- AI behaves robotic
- AI exposes orchestration
- uploads trigger automatically
- conversations lose context
- attachment analysis enters workflow execution
- AI narrates governance logic
- users feel workflow systems instead of intelligence

---

## FINAL PRINCIPLE

Tracknov Copilot must become:

“Governed Conversational Certification Intelligence”

NOT:

“AI-enhanced workflow automation bot”

END OF DOCUMENT
