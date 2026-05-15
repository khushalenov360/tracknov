# Tracknov Validation Engine (V2) -- Developer Handoff

## 1. Objective

Implement a database-driven validation engine that enforces IGBC
compliance rules at the submittal level, preventing invalid workflow
transitions and ensuring audit-ready validation.

------------------------------------------------------------------------

## 2. Core Principles

-   Validation must be DB-enforced (not UI or API dependent)
-   Every rule must be traceable
-   Validation must block workflow progression if failed
-   AI assists but never decides independently

------------------------------------------------------------------------

## 3. Validation Rule Types

Supported types:

-   MANDATORY_DOCUMENT
-   MIN_DOCUMENT_COUNT
-   DOCUMENT_TYPE_MATCH
-   NUMERIC_THRESHOLD
-   AI_VALIDATION

------------------------------------------------------------------------

## 4. Validation Rules Table

CREATE TABLE validation_rules ( id uuid PRIMARY KEY DEFAULT
gen_random_uuid(), credit_id uuid NOT NULL, submittal_id uuid NOT NULL,
validation_type text NOT NULL, expected_value jsonb, error_message text,
severity text DEFAULT 'ERROR', created_at timestamptz DEFAULT now() );

------------------------------------------------------------------------

## 5. Validation Results Table

CREATE TABLE validation_results ( id uuid PRIMARY KEY DEFAULT
gen_random_uuid(), submittal_id uuid NOT NULL, rule_id uuid NOT NULL,
status text NOT NULL, message text, checked_at timestamptz DEFAULT now()
);

------------------------------------------------------------------------

## 6. Validation Functions

### 6.1 Mandatory Document Check

Checks if at least one document exists for submittal

### 6.2 Document Type Match

Ensures uploaded document matches expected type

### 6.3 Minimum Document Count

Ensures required number of documents are uploaded

### 6.4 Numeric Threshold

Validates extracted numeric values against threshold

### 6.5 AI Validation

Uses stored AI confidence score for validation

------------------------------------------------------------------------

## 7. Validation Execution

Main function:

validate_submittal(submittal_id)

Steps: 1. Fetch all rules for submittal 2. Execute rule-specific
validation 3. Store result in validation_results 4. Return final
pass/fail

------------------------------------------------------------------------

## 8. Workflow Enforcement

Validation is enforced during state transition:

-   When moving to READY or SUBMITTED
-   Validation must pass
-   Else transition is blocked

------------------------------------------------------------------------

## 9. Credit Completion Logic

If all required submittals are APPROVED: → Credit stage becomes READY

------------------------------------------------------------------------

## 10. Project Readiness

Project is ready if: - All mandatory credits are APPROVED

------------------------------------------------------------------------

## 11. AI Integration

AI stores structured output:

{ "relevant": true, "confidence": 0.87 }

Validation checks: - Confidence threshold - Relevance flag

------------------------------------------------------------------------

## 12. Constraints

-   No validation bypass allowed
-   No silent failures
-   All results logged
-   Validation must be deterministic

------------------------------------------------------------------------

## 13. Expected Outcome

-   Zero invalid submissions
-   Fully auditable validation trail
-   Automated compliance enforcement
-   Extensible validation framework

------------------------------------------------------------------------

## Final Statement

Validation Engine is the decision authority.

Workflow enforces state. Validation enforces correctness. AI assists
only.

End of Document
