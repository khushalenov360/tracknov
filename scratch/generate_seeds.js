const fs = require('fs');
const path = require('path');

const igbcCreditPointsMap = {
  'EDA C1': 2, 'EDA C2': 2, 'EDA C3': 1, 'EDA C4': 1, 'EDA C5': 2,
  'WC C1': 12, 'WC C2': 0,
  'EE MR1': 0, 'EE C1': 1, 'EE C2': 10, 'EE C3': 4, 'EE C4': 6, 'EE C5': 1, 'EE C6': 0,
  'IM MR1': 0, 'IM MR2': 0, 'IM C1': 3, 'IM C2': 4, 'IM C3': 4, 'IM C4': 2, 'IM C5': 6, 'IM C6': 4, 'IM C7': 0, 'IM C8': 0, 'IM C9': 0, 'IM C10': 0,
  'IE MR1': 0, 'IE MR2': 0, 'IE C1': 2, 'IE C2': 4, 'IE C3': 0, 'IE C4': 2, 'IE C5': 2, 'IE C6': 2, 'IE C7': 3, 'IE C8': 4, 'IE C9': 2, 'IE C10': 4, 'IE C11': 2, 'IE C12': 1, 'IE C13': 2, 'IE C14': 0,
  'IID C1  (Credit 1.1)': 1, 'IID C1.2': 1, 'IID C1.3': 1, 'IID C1.4': 1, 'IID C2': 1
};

const jsonPath = path.join(__dirname, '../data/igbc-green-interiors-v2.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const catalog = JSON.parse(rawData);

// 1. Update JSON with max_points
const updatedCatalog = catalog.map((credit) => {
  const code = credit.credit_code;
  const points = igbcCreditPointsMap[code];
  if (points === undefined) {
    console.error(`Warning: No points defined for credit code ${code}`);
  }
  return {
    ...credit,
    max_points: points ?? 0
  };
});

fs.writeFileSync(jsonPath, JSON.stringify(updatedCatalog, null, 2), 'utf8');
console.log("Updated data/igbc-green-interiors-v2.json successfully.");

// 2. Generate 0129_seed_igbc_templates.sql
let sql = `-- Migration: 0129_seed_igbc_templates.sql
-- Seed IGBC Green Interiors v2 categories and templates from JSON catalog

-- Ensure unique constraint exists on credit_categories(rating_system_id, name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.credit_categories'::regclass 
      AND conname = 'credit_categories_rating_system_id_name_key'
  ) THEN
    ALTER TABLE public.credit_categories ADD CONSTRAINT credit_categories_rating_system_id_name_key UNIQUE (rating_system_id, name);
  END IF;
END $$;

DO $$
DECLARE
  v_rs_id uuid;
  v_cat_eda uuid;
  v_cat_wc uuid;
  v_cat_ee uuid;
  v_cat_im uuid;
  v_cat_ie uuid;
  v_cat_iid uuid;
BEGIN
  -- 1. Get rating system ID
  SELECT id INTO v_rs_id FROM public.rating_systems WHERE name = 'IGBC Green Interiors' LIMIT 1;
  
  IF v_rs_id IS NULL THEN
    RAISE EXCEPTION 'Rating system "IGBC Green Interiors" not found.';
  END IF;

  -- 2. Insert categories if missing, and get IDs
  INSERT INTO public.credit_categories (rating_system_id, name, display_order)
  VALUES 
    (v_rs_id, 'Eco Design Approach', 1),
    (v_rs_id, 'Water Conservation', 2),
    (v_rs_id, 'Energy Efficiency', 3),
    (v_rs_id, 'Interior Materials', 4),
    (v_rs_id, 'Indoor Environment', 5),
    (v_rs_id, 'Innovation in Interior Design', 6)
  ON CONFLICT (rating_system_id, name) DO UPDATE SET display_order = EXCLUDED.display_order;

  SELECT id INTO v_cat_eda FROM public.credit_categories WHERE rating_system_id = v_rs_id AND name = 'Eco Design Approach';
  SELECT id INTO v_cat_wc FROM public.credit_categories WHERE rating_system_id = v_rs_id AND name = 'Water Conservation';
  SELECT id INTO v_cat_ee FROM public.credit_categories WHERE rating_system_id = v_rs_id AND name = 'Energy Efficiency';
  SELECT id INTO v_cat_im FROM public.credit_categories WHERE rating_system_id = v_rs_id AND name = 'Interior Materials';
  SELECT id INTO v_cat_ie FROM public.credit_categories WHERE rating_system_id = v_rs_id AND name = 'Indoor Environment';
  SELECT id INTO v_cat_iid FROM public.credit_categories WHERE rating_system_id = v_rs_id AND name = 'Innovation in Interior Design';

  -- 3. Insert credit templates
`;

updatedCatalog.forEach((credit) => {
  let catVar = 'v_cat_eda';
  const catName = credit.category;
  if (catName === 'Water Conservation') catVar = 'v_cat_wc';
  else if (catName === 'Energy Efficiency') catVar = 'v_cat_ee';
  else if (catName === 'Interior Materials') catVar = 'v_cat_im';
  else if (catName === 'Indoor Environment' || catName === 'Indoor Environmental Quality') catVar = 'v_cat_ie';
  else if (catName === 'Innovation in Interior Design') catVar = 'v_cat_iid';

  const docsRequiredStr = JSON.stringify(credit.documents_required).replace(/'/g, "''");
  const docSummaryEscaped = (credit.documentation_summary ?? '').replace(/'/g, "''");
  const nameEscaped = credit.credit_name.replace(/'/g, "''");

  sql += `  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, ${catVar}, '${credit.credit_code}', '${nameEscaped}', NULL, ${credit.is_mandatory}, '${docsRequiredStr}'::jsonb, '${docSummaryEscaped}', ${credit.max_points})
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

`;
});

sql += `END $$;
`;

const migrationPath = path.join(__dirname, '../supabase/migrations/0129_seed_igbc_templates.sql');
fs.writeFileSync(migrationPath, sql, 'utf8');
console.log("Generated 0129_seed_igbc_templates.sql successfully.");
