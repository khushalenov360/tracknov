-- Fix IGBC Green Interiors v2 max_points in project_credits
-- Source: IGBC Green Interiors Reference Guide 2021 (with Addendum)
-- Verified against live DB: 47 credits, total = 100 pts
-- Applied directly to project_credits (credit_templates is unpopulated)

UPDATE public.project_credits SET max_points = CASE credit_code
  -- Eco Design Approach (EDA) — 8 pts
  WHEN 'EDA C1' THEN 2
  WHEN 'EDA C2' THEN 2
  WHEN 'EDA C3' THEN 1
  WHEN 'EDA C4' THEN 1
  WHEN 'EDA C5' THEN 2

  -- Water Conservation (WC) — 12 pts
  WHEN 'WC C1'  THEN 12
  WHEN 'WC C2'  THEN 0   -- not a separately scored credit in GI v2

  -- Energy Efficiency (EE) — 22 pts
  WHEN 'EE MR1' THEN 0
  WHEN 'EE C1'  THEN 1
  WHEN 'EE C2'  THEN 10
  WHEN 'EE C3'  THEN 4
  WHEN 'EE C4'  THEN 6
  WHEN 'EE C5'  THEN 1
  WHEN 'EE C6'  THEN 0

  -- Interior Materials (IM) — 23 pts
  WHEN 'IM MR1' THEN 0
  WHEN 'IM MR2' THEN 0
  WHEN 'IM C1'  THEN 3
  WHEN 'IM C2'  THEN 4
  WHEN 'IM C3'  THEN 4
  WHEN 'IM C4'  THEN 2
  WHEN 'IM C5'  THEN 6
  WHEN 'IM C6'  THEN 4
  WHEN 'IM C7'  THEN 0
  WHEN 'IM C8'  THEN 0
  WHEN 'IM C9'  THEN 0
  WHEN 'IM C10' THEN 0

  -- Indoor Environment (IE) — 30 pts
  WHEN 'IE MR1' THEN 0
  WHEN 'IE MR2' THEN 0
  WHEN 'IE C1'  THEN 2
  WHEN 'IE C2'  THEN 4
  WHEN 'IE C3'  THEN 0
  WHEN 'IE C4'  THEN 2
  WHEN 'IE C5'  THEN 2
  WHEN 'IE C6'  THEN 2
  WHEN 'IE C7'  THEN 3
  WHEN 'IE C8'  THEN 4
  WHEN 'IE C9'  THEN 2
  WHEN 'IE C10' THEN 4
  WHEN 'IE C11' THEN 2
  WHEN 'IE C12' THEN 1
  WHEN 'IE C13' THEN 2
  WHEN 'IE C14' THEN 0

  -- Innovation in Interior Design (IID) — 5 pts
  -- Note: first credit has extra spaces in DB code
  WHEN 'IID C1  (Credit 1.1)' THEN 1
  WHEN 'IID C1.2' THEN 1
  WHEN 'IID C1.3' THEN 1
  WHEN 'IID C1.4' THEN 1
  WHEN 'IID C2'   THEN 1

  ELSE max_points
END
WHERE credit_code IN (
  'EDA C1','EDA C2','EDA C3','EDA C4','EDA C5',
  'WC C1','WC C2',
  'EE MR1','EE C1','EE C2','EE C3','EE C4','EE C5','EE C6',
  'IM MR1','IM MR2','IM C1','IM C2','IM C3','IM C4','IM C5','IM C6','IM C7','IM C8','IM C9','IM C10',
  'IE MR1','IE MR2','IE C1','IE C2','IE C3','IE C4','IE C5','IE C6','IE C7','IE C8','IE C9','IE C10','IE C11','IE C12','IE C13','IE C14',
  'IID C1  (Credit 1.1)','IID C1.2','IID C1.3','IID C1.4','IID C2'
);

-- Verification: SELECT COUNT(*) as credits, SUM(max_points) as total FROM public.project_credits;
-- Expected: credits=47, total=100

