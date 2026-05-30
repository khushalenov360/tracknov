-- Seed initial IGBC rating system and templates
with rs as (
  insert into public.rating_systems (name, version, description)
  values ('IGBC Green Interiors', 'v2', 'IGBC Green Interiors Rating System version 2.0')
  returning id
),
cat_eda as (
  insert into public.credit_categories (rating_system_id, name, display_order)
  select id, 'Eco Design Approach', 1 from rs
  returning id
),
cat_wc as (
  insert into public.credit_categories (rating_system_id, name, display_order)
  select id, 'Water Conservation', 2 from rs
  returning id
),
cat_ee as (
  insert into public.credit_categories (rating_system_id, name, display_order)
  select id, 'Energy Efficiency', 3 from rs
  returning id
),
cat_im as (
  insert into public.credit_categories (rating_system_id, name, display_order)
  select id, 'Interior Materials', 4 from rs
  returning id
)
insert into public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
select 
  rs.id, 
  cat_eda.id, 
  'EDA C1', 
  'Optimise Circulation Spaces', 
  'Ensure efficient use of circulation areas in interior spaces.',
  false,
  '[{"type": "Narrative", "label": "Narrative", "required": true}, {"type": "Drawing", "label": "Drawing", "required": true}, {"type": "Calculation & Tables", "label": "Calculation & Tables", "required": true}, {"type": "Pic/Video", "label": "Pic/Video", "required": true}]'::jsonb,
  'Area statement, calculations, layouts, and photographs showing circulation zones.',
  1
from rs, cat_eda
union all
select 
  rs.id, 
  cat_eda.id, 
  'EDA C2', 
  'Public Transportation Proximity', 
  'Promote the use of public transportation to reduce carbon footprint.',
  false,
  '[{"type": "Narrative", "label": "Narrative", "required": true}, {"type": "Pic/Video", "label": "Pic/Video", "required": true}]'::jsonb,
  'Aerial map highlighting walking distance to public transport.',
  1
from rs, cat_eda
union all
select 
  rs.id, 
  cat_wc.id, 
  'WC C1', 
  'Water Conservation', 
  'Reduce indoor water consumption through efficient fixtures.',
  false,
  '[{"type": "Narrative", "label": "Narrative", "required": true}, {"type": "Tech Spec", "label": "Tech Spec", "required": true}, {"type": "Certificate/Declaration", "label": "Certificate/Declaration", "required": true}, {"type": "Calculation & Tables", "label": "Calculation & Tables", "required": true}, {"type": "Invoice", "label": "Invoice", "required": true}, {"type": "Pic/Video", "label": "Pic/Video", "required": true}]'::jsonb,
  'Calculations, fixture summary, manufacturer cut sheets, and invoices for water-efficient fixtures.',
  1
from rs, cat_wc
union all
select 
  rs.id, 
  cat_ee.id, 
  'EE MR1', 
  'Eco-friendly Refrigerants & Halons', 
  'Eliminate use of CFC-based refrigerants and halons.',
  true,
  '[{"type": "Narrative", "label": "Narrative", "required": true}, {"type": "Tech Spec", "label": "Tech Spec", "required": true}, {"type": "Certificate/Declaration", "label": "Certificate/Declaration", "required": true}, {"type": "Calculation & Tables", "label": "Calculation & Tables", "required": true}, {"type": "Pic/Video", "label": "Pic/Video", "required": true}]'::jsonb,
  'Narrative of AC systems and fire extinguishers, declaration of CFC-free status, and manufacturer brochures.',
  0
from rs, cat_ee;

-- Initial thresholds for the system
insert into public.rating_thresholds (rating_system_id, level_name, min_points)
select id, 'Certified', 40 from public.rating_systems where name = 'IGBC Green Interiors' and version = 'v2'
union all
select id, 'Silver', 50 from public.rating_systems where name = 'IGBC Green Interiors' and version = 'v2'
union all
select id, 'Gold', 60 from public.rating_systems where name = 'IGBC Green Interiors' and version = 'v2'
union all
select id, 'Platinum', 75 from public.rating_systems where name = 'IGBC Green Interiors' and version = 'v2';
