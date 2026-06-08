-- Fix IGBC Green Interiors v2 points based on Official Guidebook
update public.credit_templates set max_points = 2 where code = 'EDA C1';
update public.credit_templates set max_points = 2 where code = 'EDA C2';
update public.credit_templates set max_points = 1 where code = 'EDA C3';
update public.credit_templates set max_points = 1 where code = 'EDA C4';
update public.credit_templates set max_points = 2 where code = 'EDA C5';

update public.credit_templates set max_points = 12 where code = 'WC C1';
update public.credit_templates set max_points = 0 where code = 'WC C2'; -- Not in the checklist? Wait, WC C2 is 0 in New Interiors? No, wait, PDF says WC C1 is 12 points, WC C2 is not in the checklist. Wait, let me check the PDF.

update public.credit_templates set max_points = 0 where code = 'EE MR1';
update public.credit_templates set max_points = 1 where code = 'EE C1';
update public.credit_templates set max_points = 10 where code = 'EE C2';
update public.credit_templates set max_points = 4 where code = 'EE C3';
update public.credit_templates set max_points = 6 where code = 'EE C4';
update public.credit_templates set max_points = 1 where code = 'EE C5';
update public.credit_templates set max_points = 0 where code = 'EE C6';

update public.credit_templates set max_points = 0 where code = 'IM MR1';
update public.credit_templates set max_points = 0 where code = 'IM MR2';
update public.credit_templates set max_points = 3 where code = 'IM C1';
update public.credit_templates set max_points = 4 where code = 'IM C2';
update public.credit_templates set max_points = 4 where code = 'IM C3';
update public.credit_templates set max_points = 2 where code = 'IM C4';
update public.credit_templates set max_points = 6 where code = 'IM C5';
update public.credit_templates set max_points = 4 where code = 'IM C6';
update public.credit_templates set max_points = 0 where code = 'IM C7';
update public.credit_templates set max_points = 0 where code = 'IM C8';
update public.credit_templates set max_points = 0 where code = 'IM C9';
update public.credit_templates set max_points = 0 where code = 'IM C10';

update public.credit_templates set max_points = 0 where code = 'IE MR1';
update public.credit_templates set max_points = 0 where code = 'IE MR2';
update public.credit_templates set max_points = 2 where code = 'IE C1';
update public.credit_templates set max_points = 4 where code = 'IE C2';
update public.credit_templates set max_points = 0 where code = 'IE C3';
update public.credit_templates set max_points = 2 where code = 'IE C4';
update public.credit_templates set max_points = 2 where code = 'IE C5';
update public.credit_templates set max_points = 2 where code = 'IE C6';
update public.credit_templates set max_points = 3 where code = 'IE C7';
update public.credit_templates set max_points = 4 where code = 'IE C8';
update public.credit_templates set max_points = 2 where code = 'IE C9';
update public.credit_templates set max_points = 4 where code = 'IE C10';
update public.credit_templates set max_points = 2 where code = 'IE C11';
update public.credit_templates set max_points = 1 where code = 'IE C12';
update public.credit_templates set max_points = 2 where code = 'IE C13';
update public.credit_templates set max_points = 0 where code = 'IE C14';

update public.credit_templates set max_points = 1 where code = 'IID C1';
update public.credit_templates set max_points = 1 where code = 'IID C1.2';
update public.credit_templates set max_points = 1 where code = 'IID C1.3';
update public.credit_templates set max_points = 1 where code = 'IID C1.4';
update public.credit_templates set max_points = 1 where code = 'IID C2';

-- Propagate these max points down to active projects
update public.project_credits pc 
set max_points = ct.max_points 
from public.credit_templates ct 
where pc.credit_code = ct.code;
