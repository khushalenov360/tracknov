# Tracknov Scoring & Certification Engine -- Developer Handoff

## 1. Objective

Implement a database-driven scoring and certification engine that: -
Calculates credit points - Aggregates project score - Determines
certification level - Enforces IGBC compliance thresholds

------------------------------------------------------------------------

## 2. Core Principles

-   Scoring must be DB-driven (not UI-calculated)
-   Credit scoring is derived from validated submittals
-   Mandatory credits must be approved
-   Certification is rule-based and deterministic

------------------------------------------------------------------------

## 3. Credit Scoring Model

Each credit contains: - max_points - credit_type (MANDATORY / OPTIONAL)

------------------------------------------------------------------------

## 4. Credit Score Table

CREATE TABLE credit_scores ( id uuid PRIMARY KEY DEFAULT
gen_random_uuid(), project_credit_id uuid NOT NULL, achieved_points
numeric DEFAULT 0, max_points numeric, updated_at timestamptz DEFAULT
now() );

------------------------------------------------------------------------

## 5. Credit Scoring Logic

Rule: IF credit_stage = APPROVED → assign full points

ELSE → assign 0 points (V1 simplification)

------------------------------------------------------------------------

## 6. Credit Score Function

CREATE OR REPLACE FUNCTION update_credit_score(p_project_credit_id uuid)
RETURNS void AS \$\$ DECLARE max_pts numeric; is_approved boolean; BEGIN

SELECT c.max_points INTO max_pts FROM project_credits pc JOIN credits c
ON pc.credit_id = c.id WHERE pc.id = p_project_credit_id;

SELECT EXISTS ( SELECT 1 FROM credit_stages WHERE project_credit_id =
p_project_credit_id AND state = 'APPROVED' ) INTO is_approved;

IF is_approved THEN INSERT INTO credit_scores (project_credit_id,
achieved_points, max_points) VALUES (p_project_credit_id, max_pts,
max_pts) ON CONFLICT (project_credit_id) DO UPDATE SET achieved_points =
max_pts; ELSE INSERT INTO credit_scores (project_credit_id,
achieved_points, max_points) VALUES (p_project_credit_id, 0, max_pts) ON
CONFLICT (project_credit_id) DO UPDATE SET achieved_points = 0; END IF;

END; \$\$ LANGUAGE plpgsql;

------------------------------------------------------------------------

## 7. Project Score Aggregation

CREATE OR REPLACE FUNCTION calculate_project_score(p_project_id uuid)
RETURNS numeric AS \$\$ DECLARE total_score numeric; BEGIN

SELECT SUM(cs.achieved_points) INTO total_score FROM credit_scores cs
JOIN project_credits pc ON cs.project_credit_id = pc.id WHERE
pc.project_id = p_project_id;

RETURN COALESCE(total_score, 0);

END; \$\$ LANGUAGE plpgsql;

------------------------------------------------------------------------

## 8. Certification Threshold Table

CREATE TABLE certification_levels ( id uuid PRIMARY KEY DEFAULT
gen_random_uuid(), level_name text, min_points numeric );

-- Example: -- Certified → 40 -- Silver → 50 -- Gold → 60 -- Platinum →
80

------------------------------------------------------------------------

## 9. Certification Logic

CREATE OR REPLACE FUNCTION get_certification_level(p_project_id uuid)
RETURNS text AS \$\$ DECLARE score numeric; result text; BEGIN

SELECT calculate_project_score(p_project_id) INTO score;

SELECT level_name INTO result FROM certification_levels WHERE score \>=
min_points ORDER BY min_points DESC LIMIT 1;

RETURN result;

END; \$\$ LANGUAGE plpgsql;

------------------------------------------------------------------------

## 10. Mandatory Credit Enforcement

CREATE OR REPLACE FUNCTION check_mandatory_credits(p_project_id uuid)
RETURNS boolean AS \$\$ DECLARE missing_count int; BEGIN

SELECT COUNT(\*) INTO missing_count FROM project_credits pc JOIN credits
c ON pc.credit_id = c.id JOIN credit_stages cs ON pc.id =
cs.project_credit_id WHERE pc.project_id = p_project_id AND
c.credit_type = 'MANDATORY' AND cs.state != 'APPROVED';

RETURN missing_count = 0;

END; \$\$ LANGUAGE plpgsql;

------------------------------------------------------------------------

## 11. Final Certification Eligibility

CREATE OR REPLACE FUNCTION is_project_certifiable(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN check_mandatory_credits(p_project_id);
END;
$$ LANGUAGE plpgsql;

------------------------------------------------------------------------

## 12. Trigger Integration

CREATE OR REPLACE FUNCTION trigger_score_update() RETURNS trigger AS $$
BEGIN
  PERFORM update_credit_score(NEW.project_credit_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_score_update AFTER UPDATE ON credit_stages FOR EACH
ROW EXECUTE FUNCTION trigger_score_update();

------------------------------------------------------------------------

## 13. Expected Outcome

-   Automated credit scoring
-   Real-time project score
-   Deterministic certification level
-   No manual calculation required

------------------------------------------------------------------------

## Final Statement

Validation ensures correctness. Workflow ensures order. Scoring
determines outcome.

Together, they form the certification engine.

End of Document
