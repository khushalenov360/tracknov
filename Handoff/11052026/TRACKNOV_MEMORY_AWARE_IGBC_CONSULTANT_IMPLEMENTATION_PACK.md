# TRACKNOV — MEMORY-AWARE IGBC CONSULTANT IMPLEMENTATION PACK
## Phase 1 → Phase 5 Runtime Refactor Plan

## IMPORTANT

This implementation pack is NOT prompt engineering.

This is a runtime architecture rebuild.

The current repo already contains:
- AI endpoints
- attachment analysis
- workflow governance
- OCR/extraction hooks

BUT lacks:
- conversational runtime
- semantic memory
- contextual continuity
- intent orchestration
- response planning

This document defines EXACT implementation changes required.

---

# PHASE 1 — REMOVE ORCHESTRATION LEAKS

## PROBLEM

Current AI exposes:
- “Thanks for sharing”
- “Analyzing file”
- “Please confirm”
- “Processing attachment”

This makes the AI feel dumb and robotic.

---

## REQUIRED FIXES

### FILES TO MODIFY

- app/api/assistant/route.ts
- lib/services/copilot-governance.ts
- any attachment analysis formatter
- any response template helpers

---

## REMOVE

All:
- attachment acknowledgement templates
- orchestration narration
- workflow narration
- analysis narration

---

## REQUIRED BEHAVIOR

BAD:
“Thanks for sharing your file.”

GOOD:
“This appears to be an interior area chart for the Bhavarkua KFC project.”

---

# PHASE 2 — SESSION MEMORY ENGINE

## NEW TABLES

### conversation_sessions

Stores:
- active project
- active attachment
- active topic
- active credit
- session summary

### conversation_messages

Stores:
- user messages
- AI messages
- structured context

### semantic_memory

Stores:
- extracted meanings
- active entities
- unresolved discussions
- attachment insights

### analysis_cache

Stores:
- document analysis
- extracted entities
- suggested mappings
- confidence

---

## REQUIRED BACKEND MODULES

Create:

/lib/copilot-runtime/

Containing:

- session-manager.ts
- semantic-memory.ts
- analysis-cache.ts
- conversation-store.ts

---

## REQUIRED FLOW

Every AI request MUST:

1. Load session
2. Load recent conversation
3. Load semantic memory
4. Load active attachment
5. Load cached analysis
6. Build contextual payload
7. Generate response
8. Persist updated memory

---

# PHASE 3 — INTENT ROUTER

## PROBLEM

Current runtime likely does:

if attachment exists:
→ analyze

This is primitive.

---

## REQUIRED MODULE

Create:

intent-router.ts

---

## REQUIRED INTENT TYPES

- conversational
- analytical
- followup_analysis
- exploratory
- workflow
- admin
- clarification

---

## REQUIRED BEHAVIOR

User:
“What is this file?”

Intent:
analyze_attachment

User:
“What did you find?”

Intent:
followup_analysis

User:
“Map this to EDA C1”

Intent:
workflow_mapping

---

## CRITICAL RULE

Workflow execution must ONLY occur on:
explicit workflow intent.

NOT:
casual conversation.

---

# PHASE 4 — RESPONSE PLANNER

## PROBLEM

Current runtime outputs:
raw extraction + generic template.

No reasoning exists.

---

## REQUIRED MODULE

Create:

response-planner.ts

---

## RESPONSIBILITY

The response planner MUST:

- synthesize findings
- contextualize IGBC meaning
- maintain continuity
- answer naturally
- remain concise
- hide orchestration

---

## REQUIRED RESPONSE STRUCTURE

1. Direct answer
2. Key findings
3. IGBC relevance
4. Limitation/uncertainty
5. Suggested next step

---

## EXAMPLE

“This drawing appears to be an interior area chart showing seating distribution, circulation paths, and service zones.

From an IGBC perspective, it may support EDA C1 circulation planning evidence.

I cannot yet confirm compliance eligibility because the technical annotations are only partially visible.”

---

# PHASE 5 — SILENT ORCHESTRATION

## PROBLEM

Current runtime exposes:
- analysis execution
- attachment handling
- governance routing
- workflow mechanics

This destroys intelligence perception.

---

## REQUIRED RULE

The user should NEVER see:
- orchestration
- pipelines
- execution narration
- backend mechanics

---

## REQUIRED MODULE

Create:

tool-orchestrator.ts

---

## RESPONSIBILITY

The orchestrator:
- silently retrieves context
- silently retrieves analysis
- silently routes workflows
- silently checks RBAC

WITHOUT exposing internal mechanics.

---

# REQUIRED NEW RUNTIME FLOW

Current:
UI → Prompt → LLM → Response

Required:
UI
→ Session Runtime
→ Intent Router
→ Context Builder
→ Semantic Memory
→ Response Planner
→ Silent Orchestrator
→ LLM
→ Memory Persistence
→ Response

---

# REQUIRED API CHANGES

## POST /api/copilot/message

Request:

{
  "session_id": "...",
  "message": "...",
  "attachment_id": "..."
}

---

## Runtime Sequence

1. RBAC validation
2. Session retrieval
3. Intent classification
4. Context retrieval
5. Analysis cache lookup
6. Silent orchestration
7. Response planning
8. LLM generation
9. Memory persistence
10. Response

---

# REQUIRED FRONTEND STATE

Frontend MUST maintain:

{
  activeSessionId,
  activeAttachmentId,
  currentConversationTopic,
  activeCredit,
  cachedAnalysisAvailable
}

---

# REQUIRED ACCEPTANCE TESTS

## TEST 1

Upload file.
Ask:
“What is this file about?”

Then ask:
“What did you find?”

Expected:
- NO re-analysis
- conversational continuity maintained

---

## TEST 2

User references:
“that document”

Expected:
- active attachment resolved correctly

---

## TEST 3

AI remembers:
- current topic
- current attachment
- active project

within same session.

---

## TEST 4

AI MUST NOT expose:
- orchestration
- pipelines
- backend mechanics

---

# REQUIRED GLOBAL LEARNING LAYER

## IMPORTANT

Tracknov AI SHOULD learn globally.

BUT:
must NEVER leak project data.

---

## CREATE

global_semantic_patterns

Stores:
- anonymized document archetypes
- mapping confidence trends
- successful submission patterns
- validation heuristics

---

## FORBIDDEN

Never globally store:
- project names
- uploaded files
- client identifiers
- reviewer comments
- private evidence

---

# FINAL TARGET

Tracknov Copilot must evolve into:

memory-aware
context-aware
workflow-aware
IGBC-specialized
governed conversational consultant

NOT:

stateless workflow chatbot

END OF DOCUMENT
