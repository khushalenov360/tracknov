-- 0112_seed_review_criteria.sql
-- Seed review and submission criteria for foundational credits

DO $$
DECLARE
    eda1 UUID;
    eda2 UUID;
    eda3 UUID;
    we1 UUID;
    ee1 UUID;
    ie1 UUID;
    mr1 UUID;
BEGIN
    SELECT id INTO eda1 FROM public.knowledge_credit WHERE code = 'EDA C1';
    SELECT id INTO eda2 FROM public.knowledge_credit WHERE code = 'EDA C2';
    SELECT id INTO eda3 FROM public.knowledge_credit WHERE code = 'EDA C3';
    SELECT id INTO we1 FROM public.knowledge_credit WHERE code = 'WE C1';
    SELECT id INTO ee1 FROM public.knowledge_credit WHERE code = 'EE C1';
    SELECT id INTO ie1 FROM public.knowledge_credit WHERE code = 'IE C1';
    SELECT id INTO mr1 FROM public.knowledge_credit WHERE code = 'MR C1';

    -- EDA C1
    IF eda1 IS NOT NULL THEN
        INSERT INTO public.knowledge_review_criteria (credit_id, description) VALUES 
        (eda1, 'Verify that the design documents indicate preservation of existing site features.');
        INSERT INTO public.knowledge_submission_criteria (credit_id, description) VALUES 
        (eda1, 'Upload site plan highlighting preserved areas and a narrative explaining the preservation strategy.');
    END IF;

    -- EDA C2
    IF eda2 IS NOT NULL THEN
        INSERT INTO public.knowledge_review_criteria (credit_id, description) VALUES 
        (eda2, 'Verify basic landscaping design provides adequate shading.');
        INSERT INTO public.knowledge_submission_criteria (credit_id, description) VALUES 
        (eda2, 'Submit landscaping plans and shading calculations.');
    END IF;

    -- EDA C3
    IF eda3 IS NOT NULL THEN
        INSERT INTO public.knowledge_review_criteria (credit_id, description) VALUES 
        (eda3, 'Check that heat island effect reduction measures are implemented on roof and non-roof areas.');
        INSERT INTO public.knowledge_submission_criteria (credit_id, description) VALUES 
        (eda3, 'Submit roof plans, SRI value specifications, and area calculations.');
    END IF;

    -- WE C1
    IF we1 IS NOT NULL THEN
        INSERT INTO public.knowledge_review_criteria (credit_id, description) VALUES 
        (we1, 'Ensure low-flow fixtures meet the baseline water reduction thresholds.');
        INSERT INTO public.knowledge_submission_criteria (credit_id, description) VALUES 
        (we1, 'Submit water calculation, fixture cutsheets, and plumbing drawings.');
    END IF;

    -- EE C1
    IF ee1 IS NOT NULL THEN
        INSERT INTO public.knowledge_review_criteria (credit_id, description) VALUES 
        (ee1, 'Verify energy model outputs demonstrate the minimum required percentage improvement over baseline.');
        INSERT INTO public.knowledge_submission_criteria (credit_id, description) VALUES 
        (ee1, 'Submit full energy simulation report and input/output files.');
    END IF;

    -- IE C1
    IF ie1 IS NOT NULL THEN
        INSERT INTO public.knowledge_review_criteria (credit_id, description) VALUES 
        (ie1, 'Check that fresh air ventilation rates meet ASHRAE 62.1 requirements.');
        INSERT INTO public.knowledge_submission_criteria (credit_id, description) VALUES 
        (ie1, 'Submit ventilation calculations and relevant HVAC drawings.');
    END IF;

    -- MR C1
    IF mr1 IS NOT NULL THEN
        INSERT INTO public.knowledge_review_criteria (credit_id, description) VALUES 
        (mr1, 'Verify waste management plan adequately diverts construction debris from landfills.');
        INSERT INTO public.knowledge_submission_criteria (credit_id, description) VALUES 
        (mr1, 'Submit waste tracking logs and disposal invoices.');
    END IF;

END $$;
