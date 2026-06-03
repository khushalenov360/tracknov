-- 0111_seed_missing_roles.sql
-- Seed missing workflow_document_responsibility entries

-- Ensure new evidence types are present
INSERT INTO public.knowledge_evidence_type (name) VALUES
('DAYLIGHT_ANALYSIS')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
    arch_id UUID;
    mep_id UUID;
    con_id UUID;
    pmc_id UUID;
    client_id UUID;
    sus_id UUID;

    calc_id UUID;
    wcalc_id UUID;
    emodel_id UUID;
    day_id UUID;
    spec_id UUID;
    photo_id UUID;
    inv_id UUID;
BEGIN
    -- Get Roles
    SELECT id INTO arch_id FROM public.workflow_role WHERE name = 'Architect';
    SELECT id INTO mep_id FROM public.workflow_role WHERE name = 'MEP Consultant';
    SELECT id INTO con_id FROM public.workflow_role WHERE name = 'Contractor';
    SELECT id INTO pmc_id FROM public.workflow_role WHERE name = 'PMC';
    SELECT id INTO client_id FROM public.workflow_role WHERE name = 'Client';
    SELECT id INTO sus_id FROM public.workflow_role WHERE name = 'Sustainability Consultant';

    -- Get Evidence Types
    SELECT id INTO calc_id FROM public.knowledge_evidence_type WHERE name = 'CALCULATION';
    SELECT id INTO wcalc_id FROM public.knowledge_evidence_type WHERE name = 'WATER_CALCULATION';
    SELECT id INTO emodel_id FROM public.knowledge_evidence_type WHERE name = 'ENERGY_MODEL';
    SELECT id INTO day_id FROM public.knowledge_evidence_type WHERE name = 'DAYLIGHT_ANALYSIS';
    SELECT id INTO spec_id FROM public.knowledge_evidence_type WHERE name = 'SPECIFICATION';
    SELECT id INTO photo_id FROM public.knowledge_evidence_type WHERE name = 'PHOTO';
    SELECT id INTO inv_id FROM public.knowledge_evidence_type WHERE name = 'INVOICE';

    -- CALCULATION -> MEP Consultant, Architect
    IF calc_id IS NOT NULL THEN
        IF mep_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (mep_id, calc_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (mep_id, calc_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
        IF arch_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (arch_id, calc_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (arch_id, calc_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- WATER_CALCULATION -> MEP Consultant
    IF wcalc_id IS NOT NULL THEN
        IF mep_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (mep_id, wcalc_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (mep_id, wcalc_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- ENERGY_MODEL -> Sustainability Consultant, MEP Consultant
    IF emodel_id IS NOT NULL THEN
        IF sus_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (sus_id, emodel_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (sus_id, emodel_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
        IF mep_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (mep_id, emodel_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (mep_id, emodel_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- DAYLIGHT_ANALYSIS -> Architect, Sustainability Consultant
    IF day_id IS NOT NULL THEN
        IF arch_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (arch_id, day_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (arch_id, day_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
        IF sus_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (sus_id, day_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (sus_id, day_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- SPECIFICATION -> Architect, MEP Consultant
    IF spec_id IS NOT NULL THEN
        IF arch_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (arch_id, spec_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (arch_id, spec_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
        IF mep_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (mep_id, spec_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (mep_id, spec_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- PHOTO -> Contractor, PMC
    IF photo_id IS NOT NULL THEN
        IF con_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (con_id, photo_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (con_id, photo_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
        IF pmc_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (pmc_id, photo_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (pmc_id, photo_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- INVOICE -> Contractor, Client
    IF inv_id IS NOT NULL THEN
        IF con_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (con_id, inv_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (con_id, inv_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
        IF client_id IS NOT NULL THEN 
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (client_id, inv_id, 'CREATES') ON CONFLICT DO NOTHING;
            INSERT INTO public.workflow_document_responsibility (role_id, evidence_type_id, action) VALUES (client_id, inv_id, 'UPLOADS') ON CONFLICT DO NOTHING;
        END IF;
    END IF;

END $$;
