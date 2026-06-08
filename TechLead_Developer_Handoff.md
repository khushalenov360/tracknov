# TechLead Developer Handoff — Tracknov (Final Combined Charter)

## Objective
End-to-end IGBC workflow platform with DB-enforced workflows, project-credit mapping, and UI alignment.

---

# 1. DB SCHEMA (Charter)

## Master Tables
- rating_system (id, name, version)
- credit_category (id, rating_system_id, name, order)
- credit_template (id, rating_system_id, category_id, code, name, description, max_points)
- credit_scoring_rules (credit_template_id, scoring_type, allowed_values)
- rating_thresholds (rating_system_id, level_name, min_points)

## Project Tables
- project (id, name, rating_system_id, state, submission_flag, lock_flag)

## Core Mapping
- project_credit:
  - project_id
  - credit_template_id
  - credit_code, credit_name, category_name, max_points
  - state
  - achieved_points
  - is_review_required
  - UNIQUE(project_id, credit_template_id)

## Document Layer
- project_document:
  - project_id
  - project_credit_id (mandatory)
  - version_number
  - is_latest
  - state

## Audit
- workflow_logs:
  - entity_type, entity_id
  - from_state, to_state
  - user_id, timestamp
  - is_override, override_reason

---

# 2. UI FLOWS & SCREEN MAPPING

## Dashboard
- Project list
- Score + IGBC level
- Status indicators

## Project Creation
- Select rating system
- Auto-create project_credit

## Project View
- Summary + warnings
- Navigate to credits

## Credit Module
- Grouped by category
- Status + score per credit

## Credit Detail
- Documents
- Scoring
- Workflow actions

## Document Module
- Upload (mandatory credit link)
- Version tracking

## Submission Screen
- Score
- Level
- Gap
- Warnings

## Analytics
- Category contribution charts
- Credit recommendations

## Locking
- Post submission → read-only
- Admin override → unlock

---

# 3. CRITICAL RULES

- No credit_template direct usage
- No document without credit mapping
- No manual credit creation
- All workflows DB enforced

---

# 4. FINAL NOTE

Without project_credit → system invalid
