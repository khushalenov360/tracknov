# Tracknov – Supabase SQL Migration + API Structure (Copy-Paste Ready)

## 1. SUPABASE SQL MIGRATION

-- CLIENTS
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  created_at timestamp DEFAULT now()
);

-- PROJECTS
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  name text,
  rating_system_id text,
  manual_id uuid,
  status text,
  created_at timestamp DEFAULT now()
);

-- PROJECT USERS (RBAC)
CREATE TABLE project_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id),
  user_id uuid,
  role text
);

-- MANUALS
CREATE TABLE manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  version text,
  status text,
  created_at timestamp DEFAULT now()
);

-- MODULES
CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid REFERENCES manuals(id),
  code text,
  name text,
  total_points int
);

-- CREDITS
CREATE TABLE credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id),
  code text,
  name text,
  type text,
  max_points int
);

-- REQUIREMENTS
CREATE TABLE requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id uuid REFERENCES credits(id),
  type text,
  description text,
  threshold_value numeric
);

-- EVIDENCE RULES
CREATE TABLE evidence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid REFERENCES requirements(id),
  document_type text,
  mandatory boolean,
  expected_content text
);

-- PROJECT CREDITS
CREATE TABLE project_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id),
  credit_id uuid REFERENCES credits(id),
  stage text,
  status text,
  score_awarded int
);

-- SUBMITTALS
CREATE TABLE submittals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_credit_id uuid REFERENCES project_credits(id),
  requirement_id uuid REFERENCES requirements(id),
  status text
);

-- DOCUMENTS
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid REFERENCES submittals(id),
  file_url text,
  document_type text,
  status text,
  uploaded_by uuid,
  created_at timestamp DEFAULT now()
);

-- DOCUMENT VERSIONS
CREATE TABLE document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id),
  version_number int,
  file_url text,
  created_at timestamp DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_project_credits_project_id ON project_credits(project_id);
CREATE INDEX idx_documents_submittal_id ON documents(submittal_id);
CREATE INDEX idx_submittals_project_credit_id ON submittals(project_credit_id);


## 2. API STRUCTURE (NODE / NEXTJS)

src/
 ├── api/
 │    ├── projects/
 │    │    ├── create.ts
 │    │    ├── get.ts
 │    │    └── credits.ts
 │    ├── documents/
 │    │    ├── upload.ts
 │    │    ├── get.ts
 │    ├── credits/
 │    │    ├── map-document.ts
 │    │    ├── mark-ready.ts
 │    ├── validation/
 │    │    ├── check-document.ts
 │    │    ├── check-credit.ts
 │    ├── workflow/
 │    │    ├── transition.ts
 │    ├── copilot/
 │    │    ├── query.ts


## 3. CORE API LOGIC EXAMPLE

// upload.ts
export async function uploadDocument(req, res) {
  // 1. store file
  // 2. create DB record
  // 3. call validation
  // 4. return response
}

