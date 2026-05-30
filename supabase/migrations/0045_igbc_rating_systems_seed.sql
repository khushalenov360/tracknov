-- Seed all IGBC rating systems from https://igbc.in/igbcratingsystems
-- Works against the `rating_systems` table (migration 0027 schema).
-- Adds version/description columns if they don't exist yet, then seeds all systems.
-- Fully idempotent via ON CONFLICT DO NOTHING.

-- ── Ensure version & description columns exist (safe on older schemas) ────────
alter table public.rating_systems
  add column if not exists version     text    not null default 'v1',
  add column if not exists description text;

-- ── Drop the simple unique-on-name constraint and add composite one ────────────
-- Only needed when migrating from 0027 schema (unique(name)) to 0037 schema (unique(name,version)).
do $$
begin
  -- Add composite unique constraint if it doesn't already exist
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.rating_systems'::regclass
      and conname   = 'rating_systems_name_version_key'
  ) then
    alter table public.rating_systems add constraint rating_systems_name_version_key unique (name, version);
  end if;
end $$;

-- ── Seed data ─────────────────────────────────────────────────────────────────
INSERT INTO public.rating_systems (name, version, description)
VALUES
  -- IGBC Green Residential
  ('IGBC Green Homes',                              'v3', 'IGBC Green Rating System for residential homes'),
  ('IGBC Green Residential Societies',              'v1', 'IGBC Green Rating System for residential societies and gated communities'),
  ('IGBC Green Affordable Housing',                 'v1', 'IGBC Green Rating System for affordable housing projects'),
  ('IGBC NEST',                                     'v1', 'IGBC Net Zero Energy Standard for residential buildings'),

  -- IGBC Green Commercial
  ('IGBC Green New Buildings',                      'v3', 'IGBC Green Rating System for new commercial buildings'),
  ('IGBC Green Existing Buildings',                 'v3', 'IGBC Green Rating System for existing / operational commercial buildings'),
  ('IGBC Green Interiors',                          'v2', 'IGBC Green Rating System for interior fit-outs and interior spaces'),
  ('IGBC Green Healthcare',                         'v1', 'IGBC Green Rating System for hospitals and healthcare facilities'),
  ('IGBC Health and Well-being',                    'v1', 'IGBC Rating System focused on occupant health and well-being in buildings'),
  ('IGBC Green Service Buildings',                  'v1', 'IGBC Green Rating System for service and public-use buildings'),
  ('IGBC Green Resorts',                            'v1', 'IGBC Green Rating System for resort and hospitality properties'),
  ('IGBC Green Hotels',                             'v1', 'IGBC Green Rating System for hotel and accommodation facilities'),

  -- IGBC Green Industrial
  ('IGBC Green Factory Buildings',                  'v2', 'IGBC Green Rating System for factory and manufacturing facilities'),
  ('IGBC Green Logistics Parks and Warehouses',     'v1', 'IGBC Green Rating System for logistics parks and warehouse facilities'),

  -- IGBC Green Data Centers
  ('IGBC Green Data Centers',                       'v1', 'IGBC Green Rating System for data centre facilities'),

  -- IGBC Green Built Environment
  ('IGBC Green Townships',                          'v2', 'IGBC Green Rating System for integrated townships'),
  ('IGBC Green Cities',                             'v1', 'IGBC Green Rating System for new city and urban area development'),
  ('IGBC Green Existing Cities',                    'v1', 'IGBC Green Rating System for existing cities and urban areas'),
  ('IGBC Green Hill Habitat',                       'v1', 'IGBC Green Rating System for hill station and hill habitat developments'),
  ('IGBC Green Mass Rapid Transit System',          'v1', 'IGBC Green Rating System for new mass rapid transit systems (MRTS)'),
  ('IGBC Green Existing Mass Rapid Transit System', 'v1', 'IGBC Green Rating System for existing MRTS infrastructure'),
  ('IGBC Green Railway Stations',                   'v1', 'IGBC Green Rating System for railway stations'),
  ('IGBC Green High Speed Rail',                    'v1', 'IGBC Green Rating System for high-speed rail corridors'),
  ('IGBC Green Landscapes',                         'v1', 'IGBC Green Rating System for landscape and open-space projects'),
  ('IGBC Green Villages',                           'v1', 'IGBC Green Rating System for village and rural habitat development'),

  -- Other Building Typologies
  ('IGBC Green Schools',                            'v3', 'IGBC Green Rating System for school and educational institutions'),
  ('IGBC Green Campus',                             'v1', 'IGBC Green Rating System for educational campuses and universities'),
  ('IGBC Green Place of Worship',                   'v1', 'IGBC Green Rating System for places of worship'),

  -- IGBC Net Zero Rating Systems
  ('IGBC Net Zero Energy',                          'v1', 'IGBC Net Zero Energy Rating System for buildings achieving net-zero energy use'),
  ('IGBC Net Zero Water',                           'v1', 'IGBC Net Zero Water Rating System for buildings achieving net-zero water consumption'),
  ('IGBC Net Zero Waste to Landfill',               'v1', 'IGBC Net Zero Waste to Landfill Rating System'),
  ('IGBC Net Zero Carbon',                          'v1', 'IGBC Net Zero Carbon Rating System for buildings targeting net-zero carbon emissions')
ON CONFLICT (name, version) DO NOTHING;
