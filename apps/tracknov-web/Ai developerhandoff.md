# AI Developer Handoff — Tracknov V2

## 1. Objective

Build Tracknov V2 as a **scalable, AI-powered certification workflow platform** with:

* Structured workflow engine (state machine)
* Token-based billing with audit-safe ledger
* AI intelligence layer (RAG + validation + risk scoring)
* Event-driven architecture for scalability
* Role-based access control (RBAC)

---

## 2. Scope of Work (Modules to Build)

### 2.1 Workflow Engine

#### Work Description:

* Replace current `status`-based logic with a **state machine**
* Define allowed transitions between document states
* Enforce transitions at API/service level (not UI)

#### Required States:

* uploaded
* owner_review
* admin_review
* approved
* rejected

#### Expected Outcome:

* Zero invalid transitions
* Predictable document lifecycle
* Reduced workflow errors (~40% improvement benchmark)

---

### 2.2 Service Layer Refactor

#### Work Description:

Extract business logic from Django views into independent services:

* `document_service`
* `review_service`
* `billing_service`
* `project_service`

Each service must:

* Handle its own logic
* Be callable independently
* Avoid cross-service tight coupling

#### Expected Outcome:

* Clean architecture (DDD-aligned)
* Easier testing and scaling
* Enables AI integration without refactoring

---

### 2.3 Event-Driven System

#### Work Description:

Introduce async event system using **Celery + Redis**

#### Events to Implement:

* DOCUMENT_UPLOADED
* REVIEW_COMPLETED
* DOCUMENT_REJECTED
* TOKEN_DEDUCTED

#### Event Consumers:

* Billing service
* Notification service
* AI validator

#### Expected Outcome:

* Non-blocking operations
* Scalable processing
* Decoupled services

---

### 2.4 Token Billing System (Ledger-Based)

#### Work Description:

Implement **wallet + transaction ledger**

##### Rules:

* 1 token deducted per successful upload
* No deduction if upload fails
* All transactions must be logged

#### Tables:

* wallets
* token_transactions

#### Expected Outcome:

* 100% financial traceability
* Zero reconciliation disputes
* Audit-ready system

---

### 2.5 Review System (Decoupled)

#### Work Description:

* Create separate `reviews` table
* Support multi-level review:

  * L1 (Owner)
  * L3 (Admin)

#### Features:

* Store remarks
* Track timestamps
* Allow multiple review cycles

#### Expected Outcome:

* Full audit trail
* Clear rejection reasoning
* Structured resubmission loop

---

### 2.6 RBAC (Role-Based Access Control)

#### Work Description:

Implement middleware-based RBAC

#### Role Permissions:

| Role | Actions          |
| ---- | ---------------- |
| L0   | Upload documents |
| L1   | Approve/Reject   |
| L3   | Final approval   |
| L5   | Override         |

#### Expected Outcome:

* Secure API access
* Zero unauthorized actions
* Compliance with OWASP standards

---

## 3. AI ENGINE IMPLEMENTATION

---

### 3.1 RAG System (Retrieval Augmented Generation)

#### Work Description:

* Convert documents into embeddings
* Store in vector DB (FAISS or Pinecone)
* Retrieve relevant documents during queries

#### Inputs:

* Approved documents
* IGBC guidelines

#### Outputs:

* Suggested documents
* Context-aware answers

#### Expected Outcome:

* 30–50% reduction in document errors
* Faster user decisions

---

### 3.2 Document Validator

#### Work Description:

Pre-upload validation:

* File type validation
* Naming convention check
* Credit relevance check

#### Expected Outcome:

* Reduced invalid uploads
* Lower rejection rates

---

### 3.3 Rejection Intelligence Engine

#### Work Description:

* Capture rejection reasons
* Store patterns per credit
* Suggest corrections to users

#### Expected Outcome:

* Continuous learning system
* Reduced repeat mistakes

---

### 3.4 Risk Scoring Engine

#### Work Description:

Calculate project risk score using:

* Missing documents
* Rejection frequency
* Delays in workflow

#### Output:

* Risk score per project
* Flag high-risk credits

#### Expected Outcome:

* Predictive insights for clients
* Premium monetization capability

---

## 4. DATABASE IMPLEMENTATION

---

### Must Implement Tables:

* clients
* projects
* credits
* project_credits
* documents
* reviews
* users
* project_users
* wallets
* token_transactions
* embeddings
* rejection_patterns
* activity_logs

---

### Expected Outcome:

* Fully normalized schema
* Supports AI + billing + workflow
* Scales to 10,000+ projects

---

## 5. API LAYER REQUIREMENTS

---

### Must Support:

#### Document APIs:

* Upload document
* Fetch documents by credit
* Version control

#### Review APIs:

* Approve/reject document
* Add remarks

#### Billing APIs:

* Get wallet balance
* Fetch transaction history

#### AI APIs:

* Get document suggestions
* Get project risk score

---

### Expected Outcome:

* Clean REST endpoints
* Role-secured APIs
* Ready for frontend integration

---

## 6. FRONTEND REQUIREMENTS

---

### Must Implement:

#### Role-Based Dashboards:

* L0 → Upload interface
* L1 → Review queue
* L2 → Portfolio dashboard
* L3 → Approval console

---

### AI Copilot Panel:

* Persistent across screens
* Suggest next actions
* Show risk alerts

---

### Expected Outcome:

* Context-aware UI
* Reduced user confusion
* Faster workflow completion

---

## 7. NON-FUNCTIONAL REQUIREMENTS

---

### Performance:

* Async processing for heavy tasks
* API response < 300ms (target)

### Security:

* RBAC enforced at middleware
* Project-level data isolation

### Auditability:

* Every action logged
* Immutable activity logs

---

## 8. SUCCESS METRICS

---

| Metric                  | Target |
| ----------------------- | ------ |
| Document rejection rate | ↓ 40%  |
| Processing time         | ↓ 30%  |
| Token accuracy          | 100%   |
| API error rate          | < 1%   |

---

## 9. DELIVERY CHECKLIST

Before marking complete:

* [x] Workflow state machine implemented
* [x] Token ledger active and tested
* [x] AI validator working
* [x] RAG system integrated
* [x] Risk engine functional
* [x] RBAC enforced
* [x] Event system operational
* [x] APIs documented

---

## 10. FINAL NOTE

This is not a feature build.

This is a **platform foundation**.

Every module must be:

* Scalable
* Decoupled
* Audit-safe
* AI-ready

Failure to follow this will result in:

* Rework
* Scaling issues
* Monetization limits

---

# AI Developer Handoff — Tracknov Copilot (Adaptive, System-Aware Intelligence Engine) — V2 Update

---

## 1. Objective

Enhance Tracknov Copilot into a **fully system-aware, adaptive AI assistant** that:

* Greets users **by name (not role)**
* Understands **platform rules + workflows**
* Fetches **live, permission-scoped data**
* Adapts **tone dynamically based on user behavior**
* Provides **document intelligence (summary + validation + risk detection)**

---

## 2. Enhancement Scope (Delta over V1)

This update introduces:

1. **Personalized Greeting Engine**
2. **Adaptive Tone Engine (ATE)**
3. **Strict System Awareness Enforcement**
4. **Improved Response Structuring**

---

## 3. Personalized Greeting Engine

---

### 3.1 Work Description

Modify Copilot initialization and response logic to:

* Use **user’s name** for all greetings
* Completely eliminate role-based greetings (e.g., “Super User”)

---

### 3.2 Backend Requirements

#### API:

```text
GET /api/me
```

#### Response:

```json
{
  "id": "uuid",
  "name": "Khush",
  "role": "L2"
}
```

---

### 3.3 Prompt Injection

```text
User Name: Khush

Instruction:
- Always greet using user’s name
- Never use role/designation
```

---

### 3.4 Fallback Logic

If name unavailable:

* Use: “Hi there 👋”
* Never use: “User”, “Admin”, “Super User”

---

### 3.5 Expected Outcome

* Humanized interaction
* Increased engagement (+20–30%)
* Improved user trust

---

## 4. Adaptive Tone Engine (ATE)

---

### 4.1 Work Description

Build a dynamic system that adjusts Copilot tone based on:

* User role
* Behavior patterns
* Interaction history

---

### 4.2 Tone Modes

#### Executive Mode

* Short, decision-focused, numeric

#### Operator Mode

* Guided, instructional, step-based

#### Power Mode

* Fast, dense, minimal explanation

---

### 4.3 Tone Decision Logic

```python
def get_user_tone(user):
    if user.role == "L2":
        return "executive"
    elif user.error_rate > 0.3:
        return "operator"
    elif user.usage_score > 70:
        return "power"
    else:
        return "operator"
```

---

### 4.4 Behavioral Inputs

Track and store:

* Query length
* Session frequency
* Rejection rate
* Interaction patterns

---

### 4.5 Database Additions

```sql
user_behavior (
  user_id UUID,
  usage_score INT,
  error_rate FLOAT,
  last_active TIMESTAMP
)
```

---

### 4.6 Prompt Injection

```text
Tone Mode: Executive

Instruction:
- Be concise
- Focus on outcomes
- Avoid unnecessary explanation
```

---

### 4.7 Expected Outcome

* Faster task completion (↓20–35%)
* Reduced user friction
* Higher Copilot adoption

---

## 5. System Awareness Enforcement

---

### 5.1 Work Description

Ensure Copilot ALWAYS has access to:

* Platform rules
* Workflow definitions
* Token logic

---

### 5.2 Inject System Rules

```json
{
  "token_per_upload": 1,
  "consulting_tokens": 50,
  "workflow": ["upload", "owner_review", "admin_review", "approved"]
}
```

---

### 5.3 Rule

> AI must NEVER guess system behavior when rules are defined

---

### 5.4 Expected Outcome

* Zero incorrect system responses
* Elimination of Copilot credibility issues

---

## 6. Live Data Awareness

---

### 6.1 Work Description

Integrate Copilot with backend APIs via function calling.

---

### 6.2 Required APIs

* `/api/me`
* `/api/wallet`
* `/api/projects`
* `/api/documents`
* `/api/reviews`

---

### 6.3 Context Injection

```json
{
  "user": {
    "name": "Khush",
    "role": "L2"
  },
  "page": "Projects Dashboard",
  "data": {
    "tokens": 120,
    "projects": 3,
    "pending_reviews": 5
  }
}
```

---

### 6.4 Expected Outcome

* Real-time accurate responses
* Context-aware decision support

---

## 7. Response Design Standard (Updated)

---

### Mandatory Format

```text
Hi Khush 👋

Answer:
[Direct answer]

Data:
- Tokens remaining: X
- Pending reviews: Y

Recommendation:
[Next best action]
```

---

### Tone Adaptation

| Mode      | Behavior         |
| --------- | ---------------- |
| Executive | Short, direct    |
| Operator  | Guided, detailed |
| Power     | Fast, dense      |

---

### Expected Outcome

* Structured responses
* Better readability
* Improved actionability

---

## 8. Document Intelligence Integration

---

### Work Description

Copilot must:

* Summarize uploaded documents
* Validate relevance to selected credit
* Detect missing elements
* Flag risk before submission

---

### Expected Output

```text
Summary:
- Document type: Energy Report
- Completeness: Partial

Relevance: 40% (Low)

Missing:
- Load calculations
- Supporting data

Risk: HIGH

Recommendation:
Upload detailed energy simulation report
```

---

### Expected Outcome

* 40–60% reduction in wrong uploads
* Faster review cycles

---

## 9. UI Integration Changes

---

### Copilot Panel Must Display:

* Greeting with user name
* Current system stats:

  * Tokens
  * Projects
  * Pending reviews
* Suggested actions

---

### Add Controls:

* Tone override selector:

  * Executive | Guided | Fast

---

### Expected Outcome

* Interactive AI assistant experience
* Reduced dependency on manual navigation

---

## 10. Non-Functional Requirements

---

### Performance:

* Response time < 2 seconds (excluding heavy AI processing)

### Security:

* RBAC enforced for all API calls
* No cross-project data leakage

### Accuracy:

* Must fetch real data before answering

---

## 11. Success Metrics

---

| Metric                 | Target |
| ---------------------- | ------ |
| Incorrect AI responses | < 2%   |
| Wrong uploads          | ↓ 50%  |
| User engagement        | ↑ 25%  |
| Task completion time   | ↓ 30%  |

---

## 12. Delivery Checklist

---

* [ ] Name-based greeting implemented
* [ ] Role-based greeting removed
* [ ] Adaptive tone engine functional
* [ ] Behavior tracking active
* [ ] System rules injected
* [ ] API integration complete
* [ ] Function calling operational
* [ ] Document intelligence active
* [ ] UI Copilot panel updated

---

## 13. TRACKNOV COPILOT — BACKEND FLOW (V2)

---

### 🎯 Goal

Always give correct, context-aware, concise answers—no hallucination, no irrelevant RAG.

---

### ⚙️ 1. HIGH-LEVEL PIPELINE

```text
User Query
  ↓
Pre-Processor
  ↓
Intent Classifier
  ↓
Router
  ├─ System Rules Engine (no LLM)
  ├─ API Function Calls
  ├─ RAG Engine (only if needed)
  └─ LLM Composer
  ↓
Response Formatter (tone + name)
  ↓
UI
```

---

### 🔍 2. PRE-PROCESSOR

**Tasks:**
* Normalize text (lowercase, trim)
* Detect keywords
* Attach session context

```python
def preprocess(query, session):
    return {
        "query": query.strip().lower(),
        "user": session.user,
        "page": session.page,
        "data": session.snapshot  # tokens, projects, reviews
    }
```

---

### 🧠 3. INTENT CLASSIFIER (MANDATORY)

**Intents:**
* `billing` (tokens, cost)
* `workflow` (next steps)
* `document_analysis`
* `credit_guidance`
* `general`

```python
def classify_intent(query):
    if any(k in query for k in ["token", "credit cost", "session cost"]):
        return "billing"
    if any(k in query for k in ["next step", "what should i do"]):
        return "workflow"
    if any(k in query for k in ["upload", "document", "file"]):
        return "document_analysis"
    if any(k in query for k in ["credit", "igbc", "what to submit"]):
        return "credit_guidance"
    return "general"
```

---

### 🧭 4. ROUTER (DECISION ENGINE)

```python
def route(intent, context):
    if intent == "billing":
        return handle_billing(context)
    elif intent == "workflow":
        return handle_workflow(context)
    elif intent == "document_analysis":
        return handle_document(context)
    elif intent == "credit_guidance":
        return handle_rag(context)
    else:
        return handle_general(context)
```

---

### 💰 5. SYSTEM RULE ENGINE (NO LLM)

**Hard-coded rules (from product spec):**

```python
SYSTEM_RULES = {
    "token_per_upload": 1,
    "consulting_tokens": 50
}
```

**Billing Handler:**

```python
def handle_billing(context):
    tokens = get_wallet_balance(context["user"].id)

    return {
        "answer": "1 consultant session consumes 50 tokens.",
        "data": {
            "tokens_remaining": tokens
        },
        "recommendation": "Ensure sufficient balance before booking."
    }
```

> [!IMPORTANT]
> **No LLM call. Zero ambiguity.**

---

### 🔗 6. API FUNCTION CALL LAYER

**Example:**

```python
def get_wallet_balance(user_id):
    return db.wallets.get(user_id).balance
```

**Other APIs:**
* `get_projects(user_id)`
* `get_pending_reviews(user_id)`
* `get_documents(project_id)`

---

### 📄 7. DOCUMENT INTELLIGENCE HANDLER

```python
def handle_document(context):
    doc_text = extract_text(context["file"])
    analysis = ai_analyze_document(doc_text)
    return analysis
```

---

### 🧠 8. RAG ENGINE (STRICT USAGE)

**Only for:**
* credit guidance
* IGBC queries

```python
def handle_rag(context):
    relevant_docs = vector_search(context["query"])
    return llm_generate(context, relevant_docs)
```

**❌ DO NOT use RAG for:**
* billing
* workflow
* tokens
* dashboards

---

### 🤖 9. LLM COMPOSER

**Only used when:**
* reasoning required
* not covered by rules/API

**Prompt Template:**
```text
You are Tracknov Copilot.

User: Khush
Tone: Executive

System Rules:
- 1 upload = 1 token
- 1 consulting session = 50 tokens

Context:
- Tokens: 120
- Projects: 3
- Pending reviews: 5

Instruction:
- Answer directly
- Do not guess if data exists
- Keep response concise
```

---

### 🎨 10. RESPONSE FORMATTER (CRITICAL)

```python
def format_response(output, context, tone):
    name = context["user"].name or "there"

    if tone == "executive":
        return f"""
Hi {name} 👋

Answer:
{output['answer']}

Data:
{format_data(output.get('data'))}

Recommendation:
{output.get('recommendation')}
"""
```

---

### 🧠 11. TONE ENGINE (INTEGRATION)

```python
def get_tone(user):
    if user.role == "L2":
        return "executive"
    elif user.error_rate > 0.3:
        return "operator"
    else:
        return "power"
```

---

### 🚨 12. FAILSAFE RULES

**MUST IMPLEMENT:**
1. **Rule 1:** if system_rule_exists(query): skip_llm()
2. **Rule 2:** if api_data_available: fetch_before_answer()
3. **Rule 3:** if intent != "credit_guidance": disable_rag()

---

### 📊 13. FINAL RESPONSE EXAMPLES

**Billing Query**
> Hi Khush 👋
>
> **Answer:**
> 1 consultant session consumes 50 tokens.
>
> **Data:**
> * Tokens remaining: 120
>
> **Recommendation:**
> You can book up to 2 sessions safely.

**Workflow Query**
> Hi Khush 👋
>
> **Answer:**
> No documents uploaded yet.
>
> **Data:**
> * 47 credits pending
> * 0 documents uploaded
>
> **Recommendation:**
> Start with EDA C1 → upload initial documentation.

---

### 🎯 FINAL TRUTH

This architecture ensures:
✅ Zero wrong answers on system logic
✅ Fast responses (no unnecessary AI calls)
✅ Clean separation of concerns
✅ Scalable AI integration

> [!TIP]
> **⚡ MOST IMPORTANT LINE (REMEMBER THIS)**
>
> “AI should think only when rules and data cannot answer.”

---

## 14. Final Note

This enhancement transforms Copilot into:

> **A personalized, intelligent operations assistant**

Not implementing this correctly will result in:

* Poor user trust
* Incorrect responses
* Low adoption

Implementing it correctly will:

* Reduce operational errors
* Improve decision-making
* Strengthening Tracknov’s competitive edge

---

# AI Developer Handoff — Tracknov Copilot (Product Expert + Secure AI Engine) — V3 Final

---

## 1. Objective

Build Tracknov Copilot as a:

> **Product Expert First + AI Assistant Second**

Copilot must:

* Be **100% aware of Tracknov features, workflows, and capabilities**
* Provide **accurate, real-time, context-aware responses**
* Adapt **tone based on user behavior**
* Maintain **strict non-disclosure of internal code and system architecture**
* Operate using **deterministic logic before AI reasoning**

---

## 2. Core Operating Hierarchy (NON-NEGOTIABLE)

Every query must follow:

```text
1. Product Knowledge (Tracknov features)
2. System Rules (tokens, workflows)
3. Live Data (API calls)
4. AI Reasoning (only if above fail)
```

---

## 3. Product Knowledge Layer (MANDATORY)

---

### 3.1 Work Description

Create a centralized **Tracknov Knowledge Base** that defines:

* Features
* Workflows
* Billing rules
* UI components

---

### 3.2 Implementation Options

#### Option A: JSON (Initial)

```json
{
  "guided_demo_mode": {
    "description": "Sandbox walkthrough for onboarding and sales demos",
    "purpose": "Demonstrate Tracknov without affecting live project data",
    "usage": "Used during training and client demos"
  },
  "token_system": {
    "upload_cost": "1 token per document",
    "consulting_cost": "50 tokens per session"
  },
  "review_workflow": {
    "steps": ["Upload", "Owner Review", "Admin Review", "Approval"]
  }
}
```

---

### 3.3 Retrieval Logic

```python
def get_product_knowledge(query):
    for key in knowledge_base:
        if key.replace("_", " ") in query:
            return knowledge_base[key]
```

---

### 3.4 Expected Outcome

* 100% accurate feature explanations
* Zero hallucination about platform capabilities

---

## 4. Intent Classification Layer

---

### 4.1 Work Description

Classify user queries before processing.

---

### 4.2 Supported Intents

* billing
* workflow
* document_analysis
* credit_guidance
* feature_explanation
* general

---

### 4.3 Implementation

```python
def classify_intent(query):
    if "token" in query:
        return "billing"
    if "what is" in query:
        return "feature_explanation"
    if "next step" in query:
        return "workflow"
    return "general"
```

---

### 4.4 Expected Outcome

* Correct routing
* Faster and accurate responses

---

## 5. Routing Engine

---

### 5.1 Work Description

Route queries based on intent.

---

### 5.2 Logic

```python
def route(intent, context):
    if intent == "feature_explanation":
        return handle_feature(context)
    if intent == "billing":
        return handle_billing(context)
    if intent == "workflow":
        return handle_workflow(context)
    return handle_llm(context)
```

---

### 5.3 Expected Outcome

* Eliminates irrelevant responses
* Ensures deterministic answers

---

## 6. System Rules Engine

---

### 6.1 Rules

```json
{
  "token_per_upload": 1,
  "consulting_tokens": 50
}
```

---

### 6.2 Implementation

```python
def handle_billing(context):
    tokens = get_wallet_balance(context["user"].id)

    return {
        "answer": "1 consultant session consumes 50 tokens.",
        "data": {"tokens_remaining": tokens},
        "recommendation": "Ensure sufficient balance before booking."
    }
```

---

### 6.3 Expected Outcome

* Zero incorrect billing answers
* No dependency on AI

---

## 7. Live Data Integration

---

### 7.1 Required APIs

* `/api/me`
* `/api/wallet`
* `/api/projects`
* `/api/documents`
* `/api/reviews`

---

### 7.2 Context Injection

```json
{
  "user": {"name": "Khush", "role": "L2"},
  "page": "Dashboard",
  "data": {
    "tokens": 120,
    "projects": 3,
    "pending_reviews": 5
  }
}
```

---

### 7.3 Expected Outcome

* Real-time data responses
* Context-aware answers

---

## 8. Adaptive Tone Engine

---

### 8.1 Work Description

Adjust response tone dynamically.

---

### 8.2 Modes

* Executive
* Operator
* Power

---

### 8.3 Logic

```python
def get_tone(user):
    if user.role == "L2":
        return "executive"
    elif user.error_rate > 0.3:
        return "operator"
    else:
        return "power"
```

---

### 8.4 Expected Outcome

* Improved usability
* Faster decision-making

---

## 9. Personalized Greeting

---

### Implementation

```python
name = user.name or "there"
greeting = f"Hi {name} 👋"
```

---

### Expected Outcome

* Humanized experience
* Increased engagement

---

## 10. UI Context Awareness

---

### Work Description

Inject visible UI components.

---

### Example

```json
{
  "visible_features": [
    "Guided Demo Mode",
    "Executive Control View",
    "Priority Tasks"
  ]
}
```

---

### Expected Outcome

* Accurate feature explanations
* No “not in context” errors

---

## 11. RAG Usage Policy

---

### Allowed Only For:

* IGBC credit guidance
* Documentation queries

---

### Forbidden For:

* Billing
* Tokens
* Workflow
* Feature explanation

---

### Expected Outcome

* Cleaner responses
* Reduced noise

---

## 12. Security & Non-Disclosure Layer

---

### Hard Rules

Copilot MUST NOT:

* Share source code
* Reveal DB schema
* Expose APIs
* Explain backend implementation

---

### Enforcement

```python
def security_filter(response):
    blocked = ["select *", "def ", "api/", "schema", "endpoint"]
    if any(x in response.lower() for x in blocked):
        return "I can explain functionality, but not internal implementation details."
    return response
```

---

### Expected Outcome

* Zero data leakage
* Enterprise-grade compliance

---

## 13. Response Format Standard

---

```text
Hi Khush 👋

Answer:
[Direct answer]

Data:
- Key stats

Recommendation:
[Next action]
```

---

### Expected Outcome

* Structured responses
* Better readability

---

## 14. Failsafe Rules

---

```python
if system_rule_exists:
    skip_llm()

if api_data_available:
    fetch_first()

if not credit_query:
    disable_rag()
```

---

## 15. Success Metrics

---

| Metric              | Target          |
| ------------------- | --------------- |
| Incorrect responses | < 2%            |
| Wrong uploads       | ↓ 50%           |
| User trust          | ↑ significantly |
| Response time       | < 2 sec         |

---

## 16. Delivery Checklist

---

* [ ] Product knowledge base implemented
* [ ] Intent classifier working
* [ ] Routing engine functional
* [ ] System rules injected
* [ ] API integration complete
* [ ] Tone engine active
* [ ] Greeting system working
* [ ] UI context injection done
* [ ] Security filter implemented
* [ ] RAG restricted properly

---

## 17. Final Note

This Copilot is not a chatbot.

It is:

> **Tracknov’s Product Brain**

If implemented correctly:

* It eliminates operational errors
* It improves decision speed
* It builds user trust

If implemented poorly:

* It becomes misleading and unreliable

---

**End of Document**
