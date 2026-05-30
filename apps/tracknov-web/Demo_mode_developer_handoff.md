# Demo Mode Developer Handoff

**Product:** Tracknov  
**Module:** Guided Demo Mode (Sales Enablement)  
**Version:** 1.1 (Production Ready)  

---

# 1. Objective

Create a **guided, controlled demo experience** using a dummy project that:

* Explains Tracknov in **<10 minutes**
* Highlights **core value (speed, control, visibility)**
* Works without backend setup
* Is consistent across all demos

---

# 2. Core Principle

> Demo Mode is NOT a dataset.  
> It is a **guided experience layer on top of a dummy project**.

---

# 3. Entry Point & Security

## 3.1 Demo Login (Identity-Based Gating)
> [!IMPORTANT]
> **Strict Access Control:** Demo mode is exclusively restricted to the following identity:
> - **Email:** `demo@enov360.com`
> - **Role:** L2 (Client View default)

## 3.2 Security Hardening
- **No Global Toggle:** The "Enter Demo Mode" toggle or any demo-related UI elements must be invisible to all other users.
- **Server-Side Protection:** Actions like `setDemoModeAction` or `resetDemoAction` must verify the user's email is exactly `demo@enov360.com`.

---

# 4. Landing Screen Behavior

On login, show modal:

### “Start Guided Demo?”

Options:

* ✅ Start Demo
* ❌ Skip (normal usage)

---

# 5. Demo Dataset (Base Layer)

## 5.1 Preloaded Project

* Project Name: “Demo Green Building – Mumbai”
* Status: 62% complete
* Mixed states:
  * Approved credits
  * Pending uploads
  * Rejected documents

## 5.2 Data Requirements

Include:
* 15–20 credits
* 40–60 documents
* 8–10 rejections with reasons
* 3 delayed credits

## 5.3 Reset Capability

* Button: “Reset Demo”
* Restores dataset to original state

---

# 6. Guided Flow (MOST IMPORTANT)

## 6.1 Structure

Use **step-by-step overlay tooltips**. Each step must:
* Highlight UI element
* Show short instruction (max 10 words)
* Force sequence (Next button)

## 6.2 Demo Flow Steps

### STEP 1: Portfolio Dashboard
- **Highlight:** Project completion % + Risk indicator
- **Message:** “See all projects and risk instantly”

### STEP 2: Project Detail View
- **Highlight:** Credit status grid
- **Message:** “Each credit tracked with status”

### STEP 3: Pending Work
- **Highlight:** Pending credits list
- **Message:** “Know exactly what is pending”

### STEP 4: Upload Flow (Simulated)
- **Action:** Click “Upload Document”
- **Message:** “Upload mapped to credit instantly”

### STEP 5: Review Workflow
- **Highlight:** Approve / Reject buttons
- **Message:** “Structured review eliminates confusion”

### STEP 6: Rejection Insight
- **Highlight:** Rejection reason
- **Message:** “Clear feedback reduces rework”

### STEP 7: Executive Dashboard
- **Highlight:** Risk + completion summary
- **Message:** “Full portfolio visibility in one screen”

### STEP 8: Token / Cost View
- **Highlight:** Token usage
- **Message:** “Pay only for actual usage”

---

# 7. Interaction Rules

## 7.1 During Demo Mode

* **Disable destructive actions:**
  * Delete project ❌
  * Permanent edits ❌
* **Allow:**
  * Navigation ✅
  * Click simulation ✅

## 7.2 Navigation Control
- **Semi-guided (Preferred):** User can explore, with a persistent “Next Step” button visible.
- **Fully locked flow:** (Alternative) only the "Next" sequence is allowed.

---

# 8. UI Components Required

## 8.1 Tooltip Engine
* Position-aware overlays
* Arrow pointing to element
* “Next / Back / Skip” controls

## 8.2 Demo Control Panel
Top-right fixed widget:
* Exit Demo
* Restart Demo
* Progress (Step X of 8)

---

# 9. State Management

- **Flag:** `is_demo_user = true` (derived from email)
- **Behavior:**
  * Load demo dataset only
  * Prevent real data access
  * Auto-reset on logout (optional)

---

# 10. Performance Requirements

| Feature         | Requirement |
| --------------- | ----------- |
| Step transition | < 300 ms    |
| Page load       | < 2 sec     |
| Tooltip render  | Instant     |

---

# 11. Security

* Demo user isolated from real clients
* No cross-project visibility
* No data persistence required

---

# 12. Success Criteria

Demo Mode is successful if user understands:
* “What is pending?”
* “Who is responsible?”
* “Where is risk?”

---

# 13. Out of Scope

* Full AI Copilot integration
* Real-time analytics accuracy
* Advanced reporting

---

# 14. Delivery Priority

- **Phase 1 (Completed):** Dummy dataset, Guided tooltip flow, Reset function.
- **Phase 2 (Completed):** Semi-guided navigation, Demo progress tracking, stable DOM IDs.

---

# 15. Final Outcome

If implemented correctly, Tracknov will:
❌ Stop being “explained”  
✅ Start being “experienced”

---
# END
