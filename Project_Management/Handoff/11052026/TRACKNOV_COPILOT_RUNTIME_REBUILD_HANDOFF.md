# TRACKNOV — CONVERSATIONAL COPILOT RUNTIME REBUILD
## Developer Handoff v1

## PURPOSE
Transform the current Tracknov Copilot from a stateless workflow-trigger bot into a conversationally intelligent, memory-aware IGBC certification copilot modeled on EnovAIT.

## CORE ARCHITECTURAL CHANGE

Current:
User → Workflow Trigger → Tool Call → AI → Response

Required:
User → Conversational AI → Intent Router → Context Builder → Silent Tool Orchestrator → Response

---

## REQUIRED MODULES

- conversation_sessions
- conversation_messages
- semantic_memory
- analysis_cache
- intent_router
- context_builder
- response_planner
- silent_tool_orchestrator
- hallucination_guard

---

## REQUIRED DATABASE TABLES

### conversation_sessions

```sql
CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    active_attachment_id UUID NULL,
    active_credit_id UUID NULL,
    session_summary TEXT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### conversation_messages

```sql
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES conversation_sessions(id),
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    structured_context JSONB NULL,
    created_at TIMESTAMP DEFAULT now()
);
```

### semantic_memory

```sql
CREATE TABLE semantic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES conversation_sessions(id),
    memory_type TEXT NOT NULL,
    memory_key TEXT NOT NULL,
    memory_value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);
```

---

## REQUIRED RUNTIME FLOW

1. User sends message
2. Intent router classifies intent
3. Context builder loads:
   - active project
   - active attachment
   - recent conversation
   - cached analysis
4. Silent orchestration executes
5. Response planner prepares conversational output
6. AI responds naturally
7. Memory persists automatically

---

## REQUIRED BEHAVIOR

User:
“What is this file about?”

Expected:
- analyze attachment
- persist findings
- answer conversationally

User:
“What did you find?”

Expected:
- reuse previous analysis
- DO NOT re-analyze
- continue naturally

---

## FINAL PRINCIPLE

Tracknov Copilot must behave like:
“An IGBC certification consultant with memory”

NOT:
“A document-analysis trigger bot”
