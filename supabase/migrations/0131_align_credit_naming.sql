-- Migration: 0131_align_credit_naming.sql
-- Align all credit template and project credit codes to standard clean abbreviated format (e.g., 'EE C4', 'EE MR1')

-- 1. Convert "Credit [X]" to "C[X]"
UPDATE public.credit_templates
SET code = regexp_replace(code, '\s+Credit\s+', ' C')
WHERE code ~ '\s+Credit\s+';

UPDATE public.project_credits
SET credit_code = regexp_replace(credit_code, '\s+Credit\s+', ' C')
WHERE credit_code ~ '\s+Credit\s+';

-- 2. Convert "Mandatory Requirement [X]" to "MR[X]"
UPDATE public.credit_templates
SET code = regexp_replace(code, '\s+Mandatory\s+Requirement\s+', ' MR')
WHERE code ~ '\s+Mandatory\s+Requirement\s+';

UPDATE public.project_credits
SET credit_code = regexp_replace(credit_code, '\s+Mandatory\s+Requirement\s+', ' MR')
WHERE credit_code ~ '\s+Mandatory\s+Requirement\s+';

-- 3. Clean up hyphens to spaces (e.g., 'EE-C4' to 'EE C4')
UPDATE public.credit_templates
SET code = replace(code, '-', ' ')
WHERE code LIKE '%-%';

UPDATE public.project_credits
SET credit_code = replace(credit_code, '-', ' ')
WHERE credit_code LIKE '%-%';

-- 4. Strip extra spaces
UPDATE public.credit_templates
SET code = trim(regexp_replace(code, '\s+', ' ', 'g'));

UPDATE public.project_credits
SET credit_code = trim(regexp_replace(credit_code, '\s+', ' ', 'g'));
