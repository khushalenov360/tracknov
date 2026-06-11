-- Migration: 0129_seed_igbc_templates.sql
-- Seed IGBC Green Interiors v2 categories and templates from JSON catalog

-- Ensure unique constraint exists on credit_categories(rating_system_id, name)
ALTER TABLE public.credit_templates ADD COLUMN IF NOT EXISTS documentation_summary text;

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
  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_eda, 'EDA C1', 'Optimise Circulation Spaces', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Area statement in the formulae embedded excel sheet format indicating the following:
a. Total lease area/ Total built-up area
b. Total carpet area
c. Air conditioning area
d. Non-air conditioning area
e. Regularly occupied spaces
f. Non-regularly occupied spaces
2. Calculation in the formulae embedded excel sheet format indicating the percentage of circulation
areas in each space
3. Interior layouts showing the circulation zones clearly indicating the passage dimensions, breakup
of carpet areas and percentage of circulation areas in each space.
4. Geo-tagged photographs and short videos taken in different locations of the interior spaces
showing circulation', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_eda, 'EDA C2', 'Public Transportation Proximity', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, 'Option 1 Public Transport
Provide an aerial map highlighting the walking distance of public transport (bus stations, metro, rail,
waterways) from the main entrance of the building.', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_eda, 'EDA C3', 'Occupancy in a Green Facility', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"NA","required":false},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"NA","required":false}]'::jsonb, 'NA', 1)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_eda, 'EDA C4', 'Commercial Lease Term/ Ownership', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"NA","required":false}]'::jsonb, 'Option 1 Tenant Occupied Project
1.
Copy of lease agreement indicating the project name, lessor & lessee name, location, tenure and
lease commencement date
2.
Declaration from project owner stating that interior fit outs shall be retained for at least 3 or more
years
Option 2 Owner Occupied Project
1.
Copy of property tax/energy bills indicating the name of project owner
2.
Declaration from project owner stating that interior fit outs shall be retained for at least 3 or more
years', 1)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_eda, 'EDA C5', 'Awareness on Sustainability Concepts', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1.Narrative elaborating the measures implemented for creating awareness on sustainability concepts.
2.Geotagged photographs of the installed permanent signages highlighting implemented green features at various locations of the interior fit-out.
3. A schedule or record of green awareness programs conducted, including topics covered and methods of delivery (e.g., workshops, presentations, webinars).
4. Attendance records or feedback from at least one program conducted within the past 6 months to demonstrate active participation and engagement.
5. Geotagged photographs of the awareness sessions conducted by the project team.', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_wc, 'WC C1', 'Water Conservation', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, 'Case 1: Install efficient water fixtures
1. Water reduction calculations to demonstrate the savings achieved in the formula embedded excel sheet format
2. Summary sheet of the installed plumbing flow and flush fixtures with flowrates (at 3 bar pressure, for flow fixtures).
3. Manufacturer cut sheets/ brochures/ letters indicating the flow rates of the installed plumbing flow and flush fixtures.
4. Purchase invoice of the installed plumbing flow and flush fixtures highlighting the make & model. (Volume proposal projects can submit IGBC approved BOQ indicating the flow rates of the water fixtures installed in the project)
5. Geo-tagged on-site photographs and short videos of the water fixtures indicating their flow rates.', 12)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_wc, 'WC C2', 'Repurposing Rejected Water', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1)Narrative describing the measures adopted for re-use of rejected water
2. Data outlining the total volume of rejected water generated by the RO process (and/or) Air conditioning system.
3. Plumbing layout indicating the diversion of rejected water to the storage tank.
4. Geotagged photographs and videos indicating the re-use of rejected water at the interior fit-out.', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ee, 'EE MR1', 'Eco-friendly Refrigerants & Halons', NULL, true, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Detailed narrative elaborating the following:
a. List of the installed air conditioning systems, including the refrigerant types and the areas they serve, indicating that the installations are under client/developer scope.
b. List indicating the type and quantity of the fire extinguishers and the areas they serve, indicate the installations are under client/developer scope.
2. Declaration letter from the project owner and stating that CFC-free refrigerants and Halons free fire suppression systems is installed.
3. Manufacturer cut sheet/ brochure indicating the type of refrigerant used in the installed HVAC system(s) and type of the fire suppression system(s).
4. Geo-tagged photographs of HVAC system(s) indicating the type of refrigerant
5. Geo-tagged photographs of fire extinguisher(s) indicating the type of fire extinguisher', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ee, 'EE C1', 'Enhanced Eco-friendly Refrigerants', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1) Narrative elaborating the list of refrigerants installed.
 Calculation indicating the installed refrigerant has the average GWP less than 1000/650.
 Technical specification sheet indicating the credit requirements.
 Purchase invoice of the installed refrigerants indicating the make and model.
 Geotagged photographs indicating the type of refrigerant installed.', 1)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ee, 'EE C2', 'Efficient Space Conditioining', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. List of air conditioning systems installed in project & corresponding area served by each of them
2. Calculation indicating percentage of efficiently air-conditioned area (formulae embedded excel sheet)
3. HVAC layout indicating air conditioned and non-area conditioned area, fresh air supply duct, return air duct, fresh air intakes, location of air conditioning indoor & outdoor unit along with fresh air system. (Please keep all other irrelevant layers off)
4. Purchase invoice of all installed air-conditioned system indicating make & model
5. Technical specification/ manufacturer cut-sheets/ brochures / declaration letter from the manufacturer of the installed air-conditioned system indicating COP value.
6. Geo tagged photographs and short videos of installed air-conditioned system indicating make & model and COP value.', 10)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ee, 'EE C3', 'Energy Efficient Lighting', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, 'Lighting
1. Narrative elaborating the compliance option adopted and list of lighting fixtures installed.
2. Lighting layout indicating the wattage of lighting fixtures in pdf format floor plans (Please switch off the irrelevant layers)
3. Detailed LPD reduction calculation indicating the wattage of energy efficient lighting fixtures (formulae embedded excel sheet)
4. Purchase invoices of all the lighting fixtures indicating the make & model, quantity
5. Technical specification/ manufacturer cut-sheets/ brochures the installed lighting fixtures indicating the wattage
6. Geo-tagged photographs of the installed lighting fixtures indicating the wattage

Sensors
1. Narrative elaborating the sensors installed.
2. Layout indicating the wattage of lighting fixtures in pdf format floor plans (Please switch off the irrelevant layers)
3. Calculation indicating the percentage of the area covered by sensors (formulae embedded excel sheet)
4. Purchase invoices of all the lighting fixtures indicating the make & model, quantity
5. Technical specification/ manufacturer cut-sheets/ brochures the installed sensors indicating the sensitivity and area covered
6. Geo tagged photographs and short videos indicating the working of the installed sensors', 4)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ee, 'EE C4', 'Energy Efficient Appliances', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. List of energy efficient appliances installed in the project.
2. Purchase invoices of the energy efficient appliances indicating the make & model
3. Manufacturer cut-sheets/ brochures indicating the BEE 3 star rating/ 3 star Energy star rating of proposed appliances
4. Geo-tagged photographs of the energy efficient appliances indicating the BEE 3 star rating/3 star Energy star rating', 6)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ee, 'EE C5', 'Energy Metering & Management', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, 'Sub metering
1. Narrative describing the location of the sub-meters and end use applications being monitored
2. Single line diagram (SLD) indicating the locating of the sensors (pdf format floor plan)
3. Purchase invoice of the metering systems indicating the make and model.
4. Geo-tagged photographs and short videos of the installed sub-meters with permanent labelling
indicating the kWh reading

Building Management System
1. Narrative describing the application of BMS in the project and end use applications being
monitored
2. Purchase invoice of the BMS indicating the make and model.
3. Geo tagged photographs and short video of the installed BMS interface indicating the project
name and end use applications being monitored
4. For existing interior projects one year data of all the end use applications being monitored
5. For new interior projects six months data of all the end use applications being monitored.', 1)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ee, 'EE C6', 'On-site /Off-site Renewable Energy', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, 'Option 1 On-site Renewable Energy    
1. Narrative elaborating the measures implemented
2. Calculation indicating the percentage of energy consumption met through RE energy
3. Layout indicating the PV panels location and capacity in pdf format floor plan (Please switch off the irrelevant layers)
4. Technical specifications / manufacturer brochure / declaration letter from the manufacturer indicating the capacity & efficiency
5. Purchase invoice indicating the make and model and capacity of RE System.
6. Renewable energy generation report
7. Annual energy consumption bills indicating the renewable energy units generated for atleast 1 year.
8. Geotagged photographs and short videos of the renewable energy plant indicating the capacity.', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM MR1', 'Segregation of Waste, Post Occupancy', NULL, true, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative describing the strategies implemented to segregate and divert dry, wet and e-
waste.
2. Interior layouts highlighting the locations of centralised, designated areas for the temporary
storage of segregated waste collected in the project (PDF-format floor plan with all
irrelevant layers turned off).
3. Geo-tagged photographs and short videos of the bins with permanent labelling, temporary
and centralised waste storage area.
4. Agreement copies of the dry waste recycle vendor and E-waste vendor', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM MR2', 'Green Procurement Policy', NULL, true, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"NA","required":false}]'::jsonb, '1. Green procurement policy for purchasing products and materials. The procurement policy can be an independent policy (or) part of the environment policy of organisation.
2. Signed BOQ from the architect/ owner highlighting green products and materials suggested for construction and their cost (applicable only for volume proposal projects)', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM C1', 'Waste Management (During Installation of Interior fit-out)', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative indicating comprehensive list of all materials and their respective waste generated and diverted from landfill, either by weight or volume.
2. Calculation of waste generated and diverted away from landfill, either by weight or volume in a formula embedded excel sheet.
3. Declaration letter/ challan from recycle vendors/ gate pass stating donation / sale of waste material
4. Geo-tagged photographs and short videos showing the waste management, segregation of waste materials during execution', 3)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM C2', 'Local Materials', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1.Narrative describing the strategies implemented to source local materials
2. Calculations indicating the percentage of local materials sourced (in terms of cost) with
respect to the total materials cost of the project in IGBC template (formulae embedded
excel sheet)
3. Purchase invoices indicating the make & model of the claimed materials
4. Manufacturer letters or aerial maps indicating the distance between the manufacturing site
and project location', 4)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM C3', 'Recycled Content Materials', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative detailing the strategies implemented to source materials with recycled content.
2. Calculations indicating the percentage of recycled content (in terms of cost) with respect to the
total materials cost of the project in IGBC template (formulae embed excel sheet)
3. Manufacturer declaration letters/ cut-sheets/ brochures/ technical datasheet indicating the
percentage of recycled content in the materials sourced.
4. Purchase invoices indicating the make & model of the claimed materials
5. Geotagged photographs of all the claimed materials indicating the make & model', 4)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM C4', 'Use of Certified Green Building Materials, Products & Equipment', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative elaborating the strategies implemented to source materials with recycled content.
2. GreenPro/ equivalent type 1 ecolabel certificate of all the claimed products
3. Purchase invoices indicating the make & model of the claimed materials
4. Geotagged photographs of all the claimed materials indicating the make & model', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM C5', 'Salvaged Materials', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative detailing the strategies implemented to source and reuse salvaged materials.                                                                                                 2. Calculations indicating the percentage of salvaged materials (in terms of cost) sourced by the project in IGBC template (formulae embed excel sheet)
3. Declaration letters from vendors for salvaged material used.
4. Purchase receipts/ invoice from vendors for salvaged material used.
5. Geotagged photographs and videos showing the application of salvaged materials (before & after)', 6)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM C6', 'Reuse of materials', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. A narrative detailing the strategies implemented to source reused materials.
2.Calculations indicating the percentage of salvaged materials (in terms of cost) sourced by the project in formulae embed excel sheet.
3. Declaration letters from vendors for reused material used.
4. Purchase receipts/ invoice from vendors for salvaged material used.
5. Geotagged photographs and short videos showing the application of reused materials (before
& after)', 4)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM C7', 'Eco Friendly Wood Based Materials', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1.Narrative describing the strategies implemented to source eco-friendly wood based materials and list of applications in project
2.Calculation indicating the percentage of cost of eco-friendly wood-based materials to the total
cost of wood-based materials installed in the project in a formulae embedded excel sheet
3.Purchase invoices indicating the make & model of the claimed materials
4.Technical specification sheet/ manufacturer declaration/ brochure/ cut-sheet of the eco-friendly
wood-based materials indicating the percentage of rapidly renewable material or agri based or
composite wood products or recycled waste wood
5.Geo tagged photographs indicating the applications of all the eco-friendly wood-based
materials.', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM C8', 'Eco-certified Interior Furniture', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative describing the strategies implemented to source eco-friendly furniture and list of eco-friendly furniture installed in the project
2. Calculation indicating the percentage of the cost of eco-certified interior furniture of the total cost of furniture procured in formulae embed excel sheet.
3. GreenPro or BIFMA or Green Guard or equivalent type 1 ecolabel certificates of the proposed eco-certified interior product clearly indicating the make & model.
4. Purchase invoices of the eco-certified interior product indicating the make & model
5. Technical specifications/ manufacturer brochure/ cut-sheet of the eco-certified interior product installed in the project indicating the eco-labelled certification of the claimed product
6. Geo-tagged photographs of all the installed claimed furniture', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM C9', 'Life cycle Assessment', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"NA","required":false},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"NA","required":false}]'::jsonb, 'NA', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_im, 'IM C10', 'Purchase of Green Consumables', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative on the practices demonstrating the purchase of green consumables, post occupancy.
2. Purchase invoices of all the claimed consumables indicating the make & model for the last one year.
3. Technical specification sheet / certificates indicating the eco-friendly aspect of the procured consumables
4. Geo tagged photographs and short videos of the purchased green consumables certificates indicating the eco-friendly aspect of the procured consumables
5. Declaration letter indicating that green consumables will be procured for at least next three years.', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE MR1', 'Tobacco Smoke Pollution', NULL, true, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative elaborating the measures implemented to show the credit compliance 
Smoke free zone
1. A declaration letter from the project owner stating that smoking will be prohibited in all the
common areas of the building.
2. A plan showing the location of the educational signages
3. Geotagged photographs showing the installed educative signages', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE MR2', 'Fresh Air Ventilation', NULL, true, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative elaborating the measures implemented to provide fresh air in the project.  Mechanical Ventilation:
1. Calculations indicating minimum ventilation rates in all regularly occupied areas considering area and occupancy as per ASHRAE 62.1 baseline in formulae embed excel sheet format.
2. Calculation indicating the design or actual or peak occupancy.
3. HVAC layout of the project indicating the location of fresh air intake, supply air duct, return air duct, fresh air system indicating the CFM (Please keep all unnecessary layers switched off)
4. Purchase invoices of all the fresh air ventilation systems installed in the project indicating the make and model
5. Technical specifications of all the fresh air ventilation systems installed in the project indicating the capacity in CFM
6. Geotagged photographs and short videos of all the fresh air ventilation systems installed in the project indicating the capacity of fresh air unit installed
Natural Ventilation:
1. Calculations indicating the percentage of openable area (i.e. window/ door) to the carpet
area in each regularly occupied spaces.
2. Floor plans indicating the door and window schedules
3. Geotagged photographs and short videos indicating the openable spaces in the project', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C1', 'Enchanced Fresh Air Ventilation', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative elaborating the measures implemented to provide fresh air in the project.  Mechanical Ventilation:
1. Calculations indicating minimum ventilation rates in all regularly occupied areas considering area and occupancy as per ASHRAE 62.1 baseline in formulae embed excel sheet format.
2. Calculation indicating the design or actual or peak occupancy.
3. HVAC layout of the project indicating the location of fresh air intake, supply air duct, return air duct, fresh air system indicating the CFM (Please keep all unnecessary layers switched off)
4. Purchase invoices of all the fresh air ventilation systems installed in the project indicating the make and model
5. Technical specifications of all the fresh air ventilation systems installed in the project indicating the capacity in CFM
6. Geotagged photographs and short videos of all the fresh air ventilation systems installed in the project indicating the capacity of fresh air unit installed
Natural Ventilation:
1. Calculations indicating the percentage of openable area (i.e. window/ door) to the carpet area in each regularly occupied spaces.
2. Floor plans indicating the door and window schedules
3. Geotagged photographs and short videos indicating the openable spaces in the project', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C2', 'Daylighting', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, 'Measurement Approach
 Narrative elaborating the measures adopted to provide daylight to the regularly occupied area with minimum of 300 lux.
 Detailed floor plans with window and skylight schedule.
 Calculation indicating the percentage of regularly occupied areas have minimum daylight of 300 lux.
 Measurement report indicating the space wise lux level in a excel format.
 Manufacturer brochure/ cut-sheet/ letter indicating the visual light transmittance (VLT) of the installed glass.
 Geotagged photographs indicating the measuring of daylight with the values in lux.', 4)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C3', 'Thermal Comfort', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, ' Narrative elaborating the measures adopted to demonstrate thermal comfort in regularly occupied spaces throughout the year.
 For existing interiors project, latest one year data of temperature and relative humiditymaintained in the premises.
 For new interiors project, latest six months data of temperature and relative humiditymaintained in the premises.
 Calculation indicating more that 75% of the regularly occupied spaces meet thermal comfort requirement.
 Geotagged photographs and short videos of the installed thermostat indicating the temperature and relative humidity values.', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C4', 'Ergonomic Design', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative elaborating the ergonomic features provided in the project
2. Purchase invoice of the ergonomic features furniture indicating the make & model
3. Technical specification sheet of the ergonomic features furniture indicating the working of the furniture
4. Multiple geo-tagged photographs and short videos of the furniture indicating the availability of ergonomic adjustment feature.', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C5', 'Air Quality Monitoring', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative elaborating the measures adopted to maintain the indoor environment quality
2. Purchase invoice of IAQ sensors installed indicating the make & model
3. Technical specification sheet of the IAQ indicating the range and sensitivity
4. Multiple geo-tagged photographs and short videos of the sensors indicating the measurements.
5. Air quality report of quarterly monitored parameters
6. For existing interior projects, one year data of all the daily IAQ parameters being monitored.
7. For new interior projects, six months data of all the daily IAQ parameters being monitored.', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C6', 'Indoor Plants', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative indicating comprehensive list of all indoor plants.
2. Calculation indicating the number of plants required for every 100 sq. ft of total regularly
occupied area.
3. Purchase invoice indicating the list of indoor plant species procured in the project
4. AMC indicating the maintenance of the procured plants and period of contract.
5. Geotagged Photographs showing the indoor plants taken at different interior locations.
6. Declaration letter from project owner indicating that plants will be maintained for minimum
period of 3 years.', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C7', 'Material Acoustic performance', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative on approach to acoustical design in the interiors with respect to ceiling systems, partitions, flooring and list of acoustical materials installed in the interior fitout. 
Ceiling System
1. Technical data sheet clearly indicating the NRC value of ceiling system.
2. Calculation on percentage of area with different types of ceiling system.
3. Ceiling plan highlighting areas with acoustical ceiling system with clear legend indicating ceiling type.  
4. Geotagged close and long shot photographs of interior fitout indicating acoustical ceiling systems.
Flooring System
1. Technical data sheet clearly indicating the NRC value of flooring system.
2. Calculation on percentage of area with different types of flooring system.
3. Floor plan highlighting areas with acoustical ceiling system with clear legend indicating flooring type.
4. Geotagged close and long shot photographs of interior fitout indicating acoustical flooring systems.
Noise Measurement
1. Consolidated list of noise levels measured against the baseline criteria measured in different spaces within the interior fitout with 80% occupancy during measurement.
2. Geotagged photographs and short videos captured during measurement of noise levels in the interior fitout highlighting occupancy & surroundings.', 3)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C8', 'Outdoor Views', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, ' Narrative elaborating the measures adopted to achieve access to outdoor views.
 Calculation indicating the percentage of the regularly occupied areas having access to outdoor views
 Floor plan indicating the doors and windows schedule indicating the line of sight, connectivity between the interior and exterior spaces.
 Section and Elevation of the interiors indicating the finished floor level, furniture, ceiling and glazing levels respectively.
 Geotagged photographs of the interiors indicating the outdoor views from the regularly occupied spaces.
 Geotagged photographs and short videos of (N, S, E & W) elevations and views indicating the installed glazing.', 4)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C9', 'Minimise Indoor Pollutant Contamination', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, 'Narrative describing the strategies adopted to minimise the indoor pollutant contamination.

1. Fresh air supply location
a. Floor plan indicating location of fresh air intake and source of contamination.
b. Geotagged videos indicating the distance between fresh air supply and source of contamination.
2. Entry way mats:
a. Purchase invoice
b. Geotagged photographs of the entry way mat installed.
3. Isolating areas:
a. Floor plan indicating isolation of areas exposed to hazardous gases or chemicals (such as printer rooms, chemical storage rooms, janitor rooms) from regularly occupied areas.
b. Geotagged photograph of measures undertaken for isolation (such as exhaust system, self- closing door, deck-to-deck partition, etc.)
4. Air conditioning ducts:
a. Copy of AMC for cleaning air-conditioning ducts and filters (at least once in a year)
5. Green Housekeeping Products
a. Technical specification sheet / certificates indicating the eco-friendly aspect of the procured consumables
b. Geo tagged photographs and short videos of the purchased green consumables certificates indicating the eco-friendly aspect of the procured consumables
c. Declaration letter indicating that green consumables will be procured for at least next three years
d. Purchase invoice for at least previous 3 months. (for existing interior fit-outs)', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C10', 'Low-Emitting Materials', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"Required","required":true},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative describing the strategies implemented to source low emitting materials and list of applications in project.
2. List of all low VOC content materials procured in interior fitout i.e. paint & coatings, adhesives, carpets, composite wood & new wood furniture.

Paints & coatings
1. Purchase invoice/ payment receipts of all the low VOC paints & coatings
2. Manufacturer brochures/ cut-sheets/ Material Safety Data Sheet indicating the VOC content
of all paints & coatings used in the interior fitout.
3. GreenPro certificate of claimed material.

Adhesives
1. Purchase invoice/ payment receipts of all the adhesives procured.
2. Manufacturer brochures/ cut-sheets/ Material Safety Data Sheet indicating the VOC content
of all adhesives used in the interior fitout.
3. GreenPro certificate of claimed material.

Flooring systems
1. Calculation indicating percentage of area covered with carpet/wooden flooring/vinyl flooring
2. Floor plan highlighting areas with different flooring system with clear legend indicating flooring type.
3. Purchase invoice/ payment receipts of all the flooring system installed in the interior fitout.
4. GreenPro/CRI certificate of claimed material.

Composite wood
1. Purchase invoice/ payment receipts of all the composite wood procured.
2. Manufacturer brochures/ cut-sheets/ Material Safety Data Sheet highlighting it is free from urea-formaldehyde resins.
3. GreenPro certificate of claimed material.', 4)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C11', 'Indoor Air Quality Management, During Installation', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Submit narrative stating the measures implemented.
2. Geotagged photographs and videos taken at different stages of interior installations addressing
the compliance options.', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C12', 'Interior Flush out', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"Required","required":true},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative stating the flush-out procedure followed.
2. Declaration letter from the owner/ developer indicating the dates and number of days for
completing flush-out.
3. Additionally, in case of forced ventilation, submit a technical datasheet, highlighting the rating
of the MERV filter (MERV 7 or higher).
Building ﬂush-out by keeping windows open prior to occupancy Building ﬂush-out using forced ventilation systems prior to occupancy', 1)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C13', 'Occupant Well-being Facilities', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"Required","required":true},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Narrative outlines the various recreational amenities provided in the interior fit-out. 
2.Calculations indicating the percentage of occupants with access to recreational facilities at any given time, in a formula embedded excel sheet.
3. Floor plan highlighting the location of the recreational facilities in the interior fit-out.
4. Geotagged photographs & videos of the recreational facilities provided.', 2)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_ie, 'IE C14', 'Dedicated Dining Spaces', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"Required","required":true},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Layout indicating the location of the dedicated dining space in the interior fit-out.
2. Geotagged photographs of the dedicated dining space.', 0)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_iid, 'IID C1  (Credit 1.1)', 'Innovation in Interior Design', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '1. Submit a narrative describing the following:
 Intent
 Measures implemented
 Potential reduction in environmental impacts
2. Supporting documents such as drawings, illustrations, cut-sheets, test reports as applicable.', 1)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_iid, 'IID C1.2', 'Innovation in Interior Design Same as credit 1.1', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '', 1)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_iid, 'IID C1.3', 'Innovation in Interior Design Same as credit 1.1', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '', 1)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_iid, 'IID C1.4', 'Innovation in Interior Design Same as credit 1.1', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"Required","required":true},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"NA","required":false},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"Required","required":true}]'::jsonb, '', 1)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

  INSERT INTO public.credit_templates (rating_system_id, category_id, code, name, description, is_mandatory, documents_required, documentation_summary, max_points)
  VALUES (v_rs_id, v_cat_iid, 'IID C2', 'IGBC Accredited Professional', NULL, false, '[{"type":"Narrative","label":"Narrative","requirement":"NA","required":false},{"type":"Tech Spec","label":"Tech Spec","requirement":"NA","required":false},{"type":"Certificate/Declaration","label":"Certificate/Declaration","requirement":"Required","required":true},{"type":"Drawing","label":"Drawing","requirement":"NA","required":false},{"type":"Calculation & Tables","label":"Calculation & Tables","requirement":"NA","required":false},{"type":"Invoice","label":"Invoice","requirement":"NA","required":false},{"type":"Pic/Video","label":"Pic/Video","requirement":"NA","required":false}]'::jsonb, 'A copy of IGBC Accredited Professional certificate of the participant', 1)
  ON CONFLICT (rating_system_id, code) DO UPDATE 
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      is_mandatory = EXCLUDED.is_mandatory,
      documents_required = EXCLUDED.documents_required,
      documentation_summary = EXCLUDED.documentation_summary,
      max_points = EXCLUDED.max_points;

END $$;
