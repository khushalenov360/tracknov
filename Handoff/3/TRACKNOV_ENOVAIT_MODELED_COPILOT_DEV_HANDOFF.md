# TRACKNOV — ENOVAIT MODELED COPILOT ARCHITECTURE DEVELOPER HANDOFF

# OBJECTIVE

Implement the Tracknov Copilot using:

EnovAIT conversational intelligence
+
Tracknov deterministic workflow governance

The copilot MUST:
- feel like EnovAIT
- converse like EnovAIT
- maintain contextual continuity like EnovAIT

BUT:
- execute like enterprise compliance software
- enforce workflow deterministically
- remain RBAC-safe
- remain audit-safe
- remain validation-safe

---

# REQUIRED TWO-LAYER ARCHITECTURE

## LAYER 1 — CONVERSATIONAL INTELLIGENCE LAYER

Responsibilities:
- conversational tone
- contextual memory
- summarization
- attachment understanding
- proactive suggestions
- workflow guidance

Allowed:
- natural conversations
- explanations
- recommendations

Forbidden:
- direct workflow mutations
- approvals/rejections
- validation bypass
- RBAC bypass

---

## LAYER 2 — WORKFLOW ENFORCEMENT LAYER

Responsibilities:
- intent parsing
- workflow validation
- RBAC validation
- schema validation
- audit enforcement
- queue routing

ALL workflow operations MUST pass through:
workflow enforcement layer

NOT directly from LLM output.

---

# REQUIRED EXECUTION FLOW

User
→ Conversational Layer
→ Intent Detection
→ Structured Contract
→ Validation Layer
→ RBAC Layer
→ Workflow Engine
→ Audit Engine
→ UI Renderer

---

# REQUIRED COPILOT MODES

## MODE 1 — CONVERSATIONAL MODE

Used for:
- summaries
- explanations
- IGBC guidance
- workflow clarification

Natural language allowed.

---

## MODE 2 — WORKFLOW MODE

Used for:
- uploads
- assignments
- approvals
- mappings
- validations

STRICT STRUCTURED CONTRACTS ONLY.

No conversational execution negotiation allowed.

---

# REQUIRED IMPLEMENTATION

## COPILOT MODE ROUTER

Create:
copilot/router/resolveCopilotMode.ts

Required logic:

if (
   intent in [
      "upload",
      "assign",
      "approve",
      "validate",
      "map_document"
   ]
) {
   mode = "workflow"
}
else {
   mode = "conversation"
}

---

# STRUCTURED RESPONSE CONTRACTS

Workflow mode MUST return:

{
  "intent": "",
  "confidence": 0.0,
  "ui_actions": [],
  "workflow_context": {},
  "validation_state": {},
  "requires_confirmation": false
}

---

# SCHEMA VALIDATION

ALL workflow responses MUST pass:

AI
→ schema validation
→ response normalization
→ workflow execution

Create:
- copilot/contracts/
- copilot/normalizers/
- copilot/validators/

Use:
- zod
OR
- io-ts

Mandatory.

---

# REQUIRED FAILURE BEHAVIOR

If schema invalid:
DO NOT render raw AI response.

Fallback to:
deterministic workflow fallback

---

# DETERMINISTIC FALLBACK ENGINE

Create:
copilot/fallbacks/

Fallback response:

{
  "status": "fallback",
  "message": "Unable to safely determine workflow action."
}

---

# REMOVE FREEFORM EXECUTION NEGOTIATION

REMOVE:
- Please confirm upload...
- Would you like me to proceed...
- I can prepare this flow...

Replace with UI actions:

{
  "ui_actions": [
    {
      "label": "Upload to EDA C1",
      "action": "confirm_upload"
    }
  ]
}

---

# UI RENDERING RULES

Frontend MUST render:
- actions
- forms
- validation states
- deterministic controls

Frontend MUST NEVER:
- parse AI prose for workflow behavior
- infer workflow state
- infer permissions

---

# REQUIRED CONTEXT AWARENESS

Copilot MUST always know:
- current project
- current credit
- current submittal
- current workflow state
- current role
- current permissions

Create:
copilot/context/buildWorkflowContext.ts

---

# REQUIRED RBAC ENFORCEMENT

ALL workflow operations MUST validate:
- project membership
- role permissions
- workflow state
- assignment lineage

Backend remains authority.

---

# REQUIRED OBSERVABILITY

Log ALL invalid AI outputs.

Required log format:

{
  "raw_response": "",
  "validation_error": "",
  "workflow_context": {},
  "project_id": "",
  "timestamp": ""
}

---

# ACCEPTANCE CRITERIA

| Requirement | Mandatory |
|---|---|
| EnovAIT-style conversational behavior | ✅ |
| Deterministic workflow enforcement | ✅ |
| Structured workflow contracts | ✅ |
| RBAC-safe execution | ✅ |
| No freeform workflow negotiation | ✅ |
| Schema validation enforced | ✅ |
| Deterministic fallback engine | ✅ |
| Context-aware responses | ✅ |
| Workflow-safe UI rendering | ✅ |
| Audit-safe operations | ✅ |

---

# PRODUCTION BLOCKERS

DO NOT DEPLOY if:
- AI can mutate workflow directly
- raw AI prose controls workflow
- frontend infers permissions
- hallucinated actions possible
- invalid schema responses render

---

# FINAL PRINCIPLE

Tracknov Copilot should:
feel like EnovAIT

BUT:
behave like enterprise certification infrastructure

END OF DOCUMENT
