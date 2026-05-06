# AI_Auditor_Developer_Handoff.md — TRACKNOV

---

# 1. Document Purpose

Defines mandatory implementation rules, runtime behavior, enforcement expectations, and prohibited behaviors for Tracknov AI Copilot.

---

# 2. Core Principle

Tracknov AI is a controlled certification guidance layer; non-authoritative and non-workflow-controlling.

---

# 3. AI Authority Hierarchy

Manual -> Validation Engine -> Workflow Engine -> Database -> APIs -> AI -> UI

AI may not override manual/validation/workflow/permission/derived-state rules.

---

# 4. Absolute Prohibitions

AI must never approve/reject, transition workflow, mutate DB, override validation, invent rules/thresholds, or access unauthorized project data.

---

# 5. Assumption Policy

No inferred business rules or workflow behavior; ambiguity requires stop-and-clarify.

---

# 6. Allowed AI Role

Allowed: summarize, explain failures, suggest mappings, recommend next actions, answer contextual queries, surface missing requirements.

Forbidden: autonomous map/approve/reject/state change/scoring/override.

---

# 7. Mandatory AI Execution Flow

User Query -> Intent Router -> Deterministic Check -> Validation Check -> Context Builder -> AI Handler -> Response Normalizer -> Confirmation Gate -> User

---

# 8. Deterministic-First Routing

If deterministic answer exists, AI is not first responder.

Order: DB -> Validation -> Workflow -> API -> AI.

---

# 9. Intent Router

Mandatory intents: status, next_step, validation, mapping, summary, comparison, general.

Low confidence/incomplete context -> clarification prompt.

---

# 10. Context Builder

AI must receive only structured, project-scoped context; no raw dumps/cross-project context/stale manual refs.

---

# 11. Manual Version Locking

AI references project-specific locked manual version only.

---

# 12. Response Normalization

Mandatory output structure:
- Assessment
- Fit
- Reason
- Recommendation
- Confirm

---

# 13. Unknown State Rule

If data is insufficient, respond exactly:
"I cannot confirm this from your project data."

---

# 14. AI Output Execution Firewall

AI suggestions are non-executable:
AI Suggestion -> Validation -> User Confirmation -> Workflow Engine.

---

# 15. Confirmation Gate

No AI-suggested action executes without validation success and explicit user confirmation.

---

# 16. Fallback Engine

System must degrade gracefully with deterministic fallback; no "AI failed/model unavailable" messaging.

---

# 17. Fallback Response Template

Fallback must still include:
Assessment, Fit, Reason, Recommendation, Confirm.

---

# 18. Security Requirements

Prompt injection defense, retrieval sanitization, context isolation, project-scoped retrieval, RBAC filtering.

---

# 19. Prompt Injection Defense

Sanitize user prompts/uploads/extracted text; ignore malicious instructions.

---

# 20. Project Isolation

All retrieval must be project-scoped and role-scoped.

---

# 21. Response Traceability

AI responses must explain why recommendation exists and what rule/requirement it is tied to.

---

# 22. Cost Governance

Minimize AI calls via deterministic-first routing, caching, deduplication, and context trimming.

---

# 23. Model Strategy

Segment models by workload:
- routing: cheap
- extraction: medium
- reasoning: premium

---

# 24. AI Logging

Must log query, intent, model, context size, token usage, fallback usage, latency.

---

# 25. AI Testing

Mandatory adversarial tests:
hallucination, missing data, prompt injection, contradictory evidence, repeatability, fallback failures.

---

# 26. Repeatability

Same query + same context + same workflow state => same structure + same recommendation category.

---

# 27. Temperature Governance

Temperature range fixed low: 0.0 to 0.3.

---

# 28. Latency Targets

Deterministic <300ms, AI response <3s, fallback <500ms.

---

# 29. Production Blockers

Block release if AI can mutate state, leak cross-project data, lacks fallback/normalization/routing, or lacks hallucination handling.

---

# 30. Final Behavior

Tracknov AI must remain a controlled certification intelligence layer, never an autonomous decision-maker.

---

# 31. Final Principle

Validation/workflow/audit/deterministic logic must dominate AI behavior.

---

END OF DOCUMENT
