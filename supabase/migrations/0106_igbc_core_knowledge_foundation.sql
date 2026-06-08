-- 0106_igbc_core_knowledge_foundation.sql

-- ====================================================================
-- DELIVERABLE 1: IGBC KNOWLEDGE REPOSITORY
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_credit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.knowledge_requirement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID REFERENCES public.knowledge_credit(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'MANDATORY', 'CREDIT'
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.knowledge_document_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.knowledge_evidence_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.knowledge_review_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID REFERENCES public.knowledge_credit(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.knowledge_submission_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID REFERENCES public.knowledge_credit(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed IGBC Credits
INSERT INTO public.knowledge_credit (code, title, category, description) VALUES
('EDA C1', 'Eco-Design Approach 1', 'Eco-Design', 'Basic design approach requirements for IGBC'),
('EDA C2', 'Eco-Design Approach 2', 'Eco-Design', 'Advanced design approach requirements for IGBC'),
('EDA C3', 'Eco-Design Approach 3', 'Eco-Design', 'Comprehensive design approach requirements for IGBC'),
('WE C1', 'Water Efficiency 1', 'Water Efficiency', 'Water conservation measures'),
('EE C1', 'Energy Efficiency 1', 'Energy Efficiency', 'Energy consumption reduction'),
('IE C1', 'Indoor Environmental Quality 1', 'IEQ', 'Indoor air quality improvements'),
('MR C1', 'Materials and Resources 1', 'Materials', 'Sustainable material usage')
ON CONFLICT (code) DO NOTHING;

-- ====================================================================
-- DELIVERABLE 2: EVIDENCE ONTOLOGY
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.credit_evidence_mapping (
    credit_id UUID REFERENCES public.knowledge_credit(id) ON DELETE CASCADE,
    evidence_type_id UUID REFERENCES public.knowledge_evidence_type(id) ON DELETE CASCADE,
    PRIMARY KEY (credit_id, evidence_type_id)
);

-- Seed Evidence Catalog
INSERT INTO public.knowledge_evidence_type (name) VALUES
('DRAWING'), ('CALCULATION'), ('NARRATIVE'), ('PHOTO'), ('INVOICE'),
('SPECIFICATION'), ('AREA_STATEMENT'), ('ENERGY_MODEL'), ('WATER_CALCULATION')
ON CONFLICT (name) DO NOTHING;

-- Seed Mapping Example for EDA C1
DO $$
DECLARE
    eda_c1_id UUID;
    drw_id UUID;
    calc_id UUID;
    area_id UUID;
    nar_id UUID;
BEGIN
    SELECT id INTO eda_c1_id FROM public.knowledge_credit WHERE code = 'EDA C1';
    
    SELECT id INTO drw_id FROM public.knowledge_evidence_type WHERE name = 'DRAWING';
    SELECT id INTO calc_id FROM public.knowledge_evidence_type WHERE name = 'CALCULATION';
    SELECT id INTO area_id FROM public.knowledge_evidence_type WHERE name = 'AREA_STATEMENT';
    SELECT id INTO nar_id FROM public.knowledge_evidence_type WHERE name = 'NARRATIVE';

    IF eda_c1_id IS NOT NULL THEN
        IF drw_id IS NOT NULL THEN INSERT INTO public.credit_evidence_mapping (credit_id, evidence_type_id) VALUES (eda_c1_id, drw_id) ON CONFLICT DO NOTHING; END IF;
        IF calc_id IS NOT NULL THEN INSERT INTO public.credit_evidence_mapping (credit_id, evidence_type_id) VALUES (eda_c1_id, calc_id) ON CONFLICT DO NOTHING; END IF;
        IF area_id IS NOT NULL THEN INSERT INTO public.credit_evidence_mapping (credit_id, evidence_type_id) VALUES (eda_c1_id, area_id) ON CONFLICT DO NOTHING; END IF;
        IF nar_id IS NOT NULL THEN INSERT INTO public.credit_evidence_mapping (credit_id, evidence_type_id) VALUES (eda_c1_id, nar_id) ON CONFLICT DO NOTHING; END IF;
    END IF;
END $$;

-- ====================================================================
-- DELIVERABLE 3: WORKFLOW ONTOLOGY
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.workflow_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workflow_document_responsibility (
    role_id UUID REFERENCES public.workflow_role(id) ON DELETE CASCADE,
    evidence_type_id UUID REFERENCES public.knowledge_evidence_type(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- e.g., 'CREATES', 'UPLOADS'
    PRIMARY KEY (role_id, evidence_type_id, action)
);

CREATE TABLE IF NOT EXISTS public.workflow_credit_responsibility (
    role_id UUID REFERENCES public.workflow_role(id) ON DELETE CASCADE,
    credit_id UUID REFERENCES public.knowledge_credit(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- e.g., 'RESPONSIBLE'
    PRIMARY KEY (role_id, credit_id, action)
);

-- Seed Roles
INSERT INTO public.workflow_role (name) VALUES
('Architect'), ('MEP Consultant'), ('Contractor'), ('PMC'), ('Client'), ('Sustainability Consultant')
ON CONFLICT (name) DO NOTHING;

-- Seed Workflow Example for Architect
DO $$
DECLARE
    arch_id UUID;
    drw_id UUID;
    eda_c1_id UUID;
    eda_c2_id UUID;
BEGIN
    SELECT id INTO arch_id FROM public.workflow_role WHERE name = 'Architect';
    SELECT id INTO drw_id FROM public.knowledge_evidence_type WHERE name = 'DRAWING';
    SELECT id INTO eda_c1_id FROM public.knowledge_credit WHERE code = 'EDA C1';
    SELECT id INTO eda_c2_id FROM public.knowledge_credit WHERE code = 'EDA C2';

    IF arch_id IS NOT NULL THEN
        IF drw_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (arch_id, drw_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (arch_id, drw_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;

        IF eda_c1_id IS NOT NULL THEN 
            INSERT INTO public.workflow_credit_responsibility (role_id, credit_id, action) VALUES (arch_id, eda_c1_id, 'RESPONSIBLE') ON CONFLICT DO NOTHING;
        END IF;
        
        IF eda_c2_id IS NOT NULL THEN 
            INSERT INTO public.workflow_credit_responsibility (role_id, credit_id, action) VALUES (arch_id, eda_c2_id, 'RESPONSIBLE') ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;
