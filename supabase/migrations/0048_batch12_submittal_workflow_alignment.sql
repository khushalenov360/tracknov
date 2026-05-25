-- Batch 1 + 2 alignment (TechLead execution handoff)
-- Goal: enforce document -> submittal -> credit_stage -> project_credit chain

do $$
begin
  if to_regclass('public.project_document') is null and to_regclass('public.documents') is not null then
    execute 'alter table public.documents rename to project_document';
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_type where typname = 'workflow_state') then
    begin
      alter type public.workflow_state add value if not exists 'DRAFT';
      alter type public.workflow_state add value if not exists 'READY';
      alter type public.workflow_state add value if not exists 'SUBMITTED';
      alter type public.workflow_state add value if not exists 'UNDER_REVIEW';
      alter type public.workflow_state add value if not exists 'APPROVED';
      alter type public.workflow_state add value if not exists 'REJECTED';
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;

alter table if exists public.credit_stages
  add column if not exists project_credit_id uuid references public.project_credits(id) on delete cascade;

-- Existing seed used unique(credit_id, stage). For per-project execution, we now pivot on project_credit.
alter table if exists public.credit_stages
  drop constraint if exists credit_stages_credit_id_stage_key;

create unique index if not exists credit_stages_project_credit_stage_uk
  on public.credit_stages(project_credit_id, stage)
  where project_credit_id is not null;

insert into public.credit_stages (project_credit_id, credit_id, stage, state, version)
select
  pc.id as project_credit_id,
  pc.credit_id,
  st.stage::public.igbc_stage,
  'DRAFT',
  1
from public.project_credits pc
cross join (values ('DESIGN'), ('CONSTRUCTION')) as st(stage)
where not exists (
  select 1
  from public.credit_stages cs
  where cs.project_credit_id = pc.id
    and cs.stage = st.stage::public.igbc_stage
);

alter table if exists public.submittals
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists credit_id uuid references public.credits(id) on delete cascade,
  add column if not exists iteration integer not null default 1,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists state public.workflow_state not null default 'DRAFT'::public.workflow_state;

-- Backfill submittal routing columns from credit_stage -> project_credit
update public.submittals s
set
  project_id = pc.project_id,
  credit_id = coalesce(s.credit_id, pc.credit_id)
from public.credit_stages cs
join public.project_credits pc on pc.id = cs.project_credit_id
where s.credit_stage_id = cs.id
  and (s.project_id is null or s.credit_id is null);

alter table if exists public.project_document
  add column if not exists submittal_id uuid references public.submittals(id) on delete set null;

create index if not exists idx_project_document_submittal
  on public.project_document(submittal_id);

create index if not exists idx_credit_stages_project_credit
  on public.credit_stages(project_credit_id);

create index if not exists idx_submittals_state
  on public.submittals(state);

create or replace function public.enforce_document_submittal_chain()
returns trigger as $$
declare
  v_submittal record;
  v_stage record;
begin
  if new.submittal_id is null then
    if tg_op = 'INSERT' then
      raise exception 'submittal_id is mandatory for new project documents';
    end if;
    return new;
  end if;

  select * into v_submittal
  from public.submittals
  where id = new.submittal_id;

  if not found then
    raise exception 'Invalid submittal_id for project document';
  end if;

  if v_submittal.project_id is not null and new.project_id is distinct from v_submittal.project_id then
    raise exception 'Document project_id does not match linked submittal project_id';
  end if;

  if v_submittal.credit_id is not null and new.credit_id is distinct from v_submittal.credit_id then
    raise exception 'Document credit_id does not match linked submittal credit_id';
  end if;

  if v_submittal.credit_stage_id is not null and new.project_credit_id is not null then
    select * into v_stage
    from public.credit_stages
    where id = v_submittal.credit_stage_id;

    if found and v_stage.project_credit_id is not null and new.project_credit_id is distinct from v_stage.project_credit_id then
      raise exception 'Document project_credit_id does not match submittal credit stage';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists project_document_submittal_chain_guard on public.project_document;
create trigger project_document_submittal_chain_guard
before insert or update on public.project_document
for each row
execute function public.enforce_document_submittal_chain();

create or replace function public.insert_document_and_consume_tokens(
  p_project_id uuid,
  p_credit_id uuid,
  p_project_credit_id uuid,
  p_submittal_id uuid,
  p_uploaded_by uuid,
  p_file_name text,
  p_file_path text,
  p_file_type text,
  p_doc_category text,
  p_notes text,
  p_status text,
  p_version integer,
  p_is_latest boolean,
  p_parent_document_id uuid,
  p_client_user_id uuid,
  p_tokens integer,
  p_reason text,
  p_actor_id uuid,
  p_token_meta jsonb,
  p_file_hash text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_document_id uuid;
  v_state text;
begin
  v_state := upper(coalesce(p_status, 'DRAFT'));
  if v_state not in ('DRAFT','READY','SUBMITTED','UNDER_REVIEW','CLARIFICATION','RESUBMITTED','APPROVED','REJECTED') then
    raise exception 'Invalid document state %', v_state;
  end if;

  insert into public.project_document (
    project_id,
    credit_id,
    project_credit_id,
    submittal_id,
    uploaded_by,
    file_name,
    file_path,
    file_type,
    doc_category,
    notes,
    state,
    workflow_state,
    version,
    is_latest,
    parent_document_id,
    file_hash
  ) values (
    p_project_id,
    p_credit_id,
    p_project_credit_id,
    p_submittal_id,
    p_uploaded_by,
    p_file_name,
    p_file_path,
    p_file_type,
    p_doc_category,
    p_notes,
    v_state,
    v_state::public.workflow_state,
    p_version,
    p_is_latest,
    p_parent_document_id,
    p_file_hash
  ) returning id into v_document_id;

  if p_parent_document_id is not null then
    update public.project_document
    set is_latest = false
    where id = p_parent_document_id;
  end if;

  perform public.consume_client_tokens(
    p_client_user_id,
    p_project_id,
    p_tokens,
    p_reason,
    p_actor_id,
    coalesce(p_token_meta, '{}'::jsonb) || jsonb_build_object('document_id', v_document_id)
  );

  return v_document_id;
end;
$$;

