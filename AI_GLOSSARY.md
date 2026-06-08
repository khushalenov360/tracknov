# Tracknov AI Architecture & Glossary

This document serves to clearly define the terminology, separation of concerns, and underlying architecture of the AI systems within the Tracknov ecosystem.

---

## EnovAIT
**EnovAIT = Tracknov AI Platform**

EnovAIT is the foundational, underlying AI platform and orchestration layer that powers the entire ecosystem. It handles the core responsibilities of model routing, API fallbacks, tool calling pipelines, and raw intelligence extraction. It is the core intelligence engine independent of any specific use case.

---

## Harita
**Harita = EnovAIT-powered IGBC Consultant + Tracknov Runtime Context + IGBC Domain Intelligence + Tracknov Workflows**

Harita is the specialized, user-facing agent built *on top* of EnovAIT. She is configured specifically to act as an IGBC (Indian Green Building Council) Consultant.

Harita’s capabilities are defined by combining:
1. **EnovAIT Core Engine:** The raw LLM streaming, provider failovers, and function-calling capabilities.
2. **Tracknov Runtime Context:** Real-time awareness of the user's workspace, active projects, and current UI state.
3. **IGBC Domain Intelligence:** Specialized system prompts, credit-scoring logic, and structural knowledge of Green Building standards.
4. **Tracknov Workflows:** The Consultant Response Planners that allow her to execute specific actions (e.g., updating credits, modifying documents) within the Tracknov application.
