# HARITA AUTOMATED RUNTIME RELATIONAL DATABASE MASTER SPECIFICATION
==============================================================================
PROJECT COMPONENT: SUPABASE SCHEMA & STRUCTURE MATRIX DEFINITIONS
TARGET ENVIRONMENT: PRODUCTION COMPLIANCE DATABASE (TRACKNOV-SERVER)
STATUS: STABLE DEPLOYMENT SPECIFICATION (CONSOLIDATED - ZERO CODE ON SCREEN)

This single-file specification defines the complete database infrastructure 
required to support Harita's high-frequency multi-format auditing engine. It 
maps out all tables, constraints, index configurations, and real-time triggers 
with zero placeholders.

------------------------------------------------------------------------------
PART 1: CUSTOM DATA TYPE BOUNDARIES & ENUMERATIONS
------------------------------------------------------------------------------
To ensure absolute validation security, the database enforces strict custom types 
before data hits table cells. This completely isolates values from symbol drift.

### I. CUSTOM FORMAT TYPE ENUM: `submittal_file_format`
- **Permitted Values:** `PDF_GUIDE`, `PDF_VECTOR_PLAN`, `CAD_DWG`, `CAD_DXF`, `XLSX_TRACKER`, `CSV_DATA`, `IMAGE_PNG`, `IMAGE_JPEG`
- **Objective:** Validates incoming file attachments at the entry point so the Ingestion Dispatcher knows exactly which layout parser to deploy.

### II. CUSTOM COMPLIANCE STATUS ENUM: `compliance_status_tier`
- **Permitted Values:** `NOT_STARTED`, `IN_PROGRESS`, `PENDING_AUDIT_REVIEW`, `COMPLIANT_APPROVED`, `PREREQUISITE_VIOLATION`, `REJECTED`
- **Objective:** Dictates the real-time evaluation status of each individual credit row in the workspace.

### III. CUSTOM MODULE CATEGORY ENUM: `igbc_module_category`
- **Permitted Values:** `ECO_DESIGN`, `WATER_CONSERVATION`, `ENERGY_EFFICIENCY`, `MATERIALS_RESOURCES`, `INDOOR_ENVIRONMENTAL_QUALITY`, `INNOVATION_DESIGN`
- **Objective:** Maps every credit explicitly to its authoritative section in the 2021 Guidebook.

------------------------------------------------------------------------------
PART 2: THE DATA ARCHITECTURE LEDGER (CORE TABLES SPECIFICATION)
------------------------------------------------------------------------------

### TABLE I: `public.projects` (THE ROOT INFRASTRUCTURE ENTITY)
- **Primary ID:** `id` (UUIDv4, Auto-generated, Primary Key)
- **Data Columns & Constraints:**
  * `name` (Text string, Not Null, Unique constraint)
  * `total_carpet_area_sqft` (Numeric float, Not Null, Enforced Positive Value Check)
  * `occupant_count_baseline` (Integer count, Not Null, Enforced Positive Value Check)
  * `created_at` (Timestamp with timezone tracking, Defaults to System Now)
  * `updated_at` (Timestamp with timezone tracking, Defaults to System Now)
- **Relational Behavior:** Acts as the parent table. Deleting a row here cascadingly clears all child credit tracking matrices.

### TABLE II: `public.project_credits` (THE COMPLIANCE SLOTS MATRIX)
- **Primary ID:** `id` (UUIDv4, Auto-generated, Primary Key)
- **Foreign Key Link:** `project_id` (UUIDv4, References `public.projects.id`, Cascades on Delete)
- **Data Columns & Constraints:**
  * `credit_code` (Varchar string, e.g., 'EE_C1', 'WC_P1', Not Null)
  * `credit_title` (Text string, Not Null)
  * `module_bucket` (Type: `igbc_module_category`, Not Null)
  * `is_mandatory_prerequisite` (Boolean flag, Defaults to False)
  * `target_points_max` (Integer rating, Default value 1, Max limit constraint 4)
  * `earned_points_tally` (Integer rating, Default value 0, Max limit boundary check)
  * `current_status` (Type: `compliance_status_tier`, Default state: 'NOT_STARTED')
  * `assigned_consultant_role` (Text label, Nullable)
- **Unique Composite Key:** (`project_id`, `credit_code`) -> Prevents duplicate credit rules inside the same project tracker.

### TABLE III: `public.project_documents` (THE FORENSIC AUDIT TRAIL REPOSITORY)
- **Primary ID:** `id` (UUIDv4, Auto-generated, Primary Key)
- **Foreign Key Link:** `project_id` (UUIDv4, References `public.projects.id`, Cascades on Delete)
- **Foreign Key Link:** `credit_id` (UUIDv4, References `public.project_credits.id`, Cascades on Delete)
- **Data Columns & Constraints:**
  * `file_name` (Text description, Not Null)
  * `storage_bucket_url` (Text path string, Not Null, Unique resource link)
  * `format_profile` (Type: `submittal_file_format`, Not Null)
  * `extracted_variables_payload` (JSONB format, Defaults to empty object `{}`)
  * `is_verified_by_reviewer` (Boolean flag, Defaults to False)
  * `uploaded_at` (Timestamp with timezone tracking, Defaults to System Now)

------------------------------------------------------------------------------
PART 4: PERFORMANCE TUNING (HIGH-FREQUENCY LOOKUP INDEXES)
------------------------------------------------------------------------------
To optimize performance during thousands of real-time queries and prevent database lag, the system deploys targeted composite indexes:

1. **Index Name:** `idx_credits_project_search`
   - **Target Parameters:** `project_credits(project_id, credit_code)`
   - **Objective:** Accelerates target search speeds when Harita isolates a single credit status for a project.
2. **Index Name:** `idx_documents_credit_search`
   - **Target Parameters:** `project_documents(credit_id)`
   - **Objective:** Instantly groups all uploaded invoices, certifications, and CAD vectors linked to a specific credit review sequence.

------------------------------------------------------------------------------
PART 5: ARCHITECTURAL DEPLOYMENT STEPS FOR DEV AGENT
------------------------------------------------------------------------------
1. Launch your Supabase Workspace Console interface and navigate to the SQL Database Editor panel.
2. Direct **antigravity** to run the initialization sequences: compile custom types first, assemble core entity tables sequentially next, and establish foreign constraints last.
3. Turn on Row Level Security (RLS) parameters across all three newly created tables, providing secure read/write handshakes for your verified API service container keys.
4. Verify deployment integrity by executing an environment check script to confirm table relational links map perfectly.
==============================================================================