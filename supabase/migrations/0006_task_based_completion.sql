-- 0006_task_based_completion.sql

create or replace function public.recalculate_credit_completion()
returns trigger
language plpgsql
as $$
declare
  target_credit uuid;
  required_doc_count integer;
  approved_doc_count integer;
  target_credit_row public.project_credits%rowtype;
  new_status text;
  req jsonb;
  req_type text;
  req_is_required boolean;
  item_completion numeric;
  total_completion numeric;
  has_approved_doc boolean;
  active_task_status text;
begin
  if TG_TABLE_NAME = 'project_document' then
    target_credit := coalesce(new.credit_id, old.credit_id);
  elsif TG_TABLE_NAME = 'tasks' then
    target_credit := coalesce(new.project_credit_id, old.project_credit_id);
  else
    return coalesce(new, old);
  end if;

  if target_credit is null then
    return coalesce(new, old);
  end if;

  select * into target_credit_row from public.project_credits where id = target_credit;
  if target_credit_row.id is null then
    return coalesce(new, old);
  end if;

  required_doc_count := 0;
  total_completion := 0;

  for req in select * from jsonb_array_elements(target_credit_row.documents_required) loop
    req_type := req->>'type';
    req_is_required := coalesce((req->>'required')::boolean, false);
    
    if req_is_required then
      required_doc_count := required_doc_count + 1;
      
      -- Check if there is an approved document
      select exists(
        select 1 from public.project_document 
        where credit_id = target_credit 
          and doc_category = req_type 
          and status = 'approved'
      ) into has_approved_doc;
      
      if has_approved_doc then
        item_completion := 100;
      else
        -- Check tasks for this doc_type
        select task_status into active_task_status
        from public.tasks
        where project_credit_id = target_credit
          and doc_type = req_type
        order by updated_at desc
        limit 1;
        
        if active_task_status = 'APPROVED' then
          item_completion := 100;
        elsif active_task_status = 'UNDER_REVIEW' or active_task_status = 'CLARIFICATION' or active_task_status = 'UPLOADED' then
          item_completion := 75;
        elsif active_task_status = 'IN_PROGRESS' then
          item_completion := 25;
        else
          item_completion := 0;
        end if;
      end if;
      
      total_completion := total_completion + item_completion;
    end if;
  end loop;

  select count(distinct doc_category) into approved_doc_count
  from public.project_document
  where credit_id = target_credit
    and status = 'approved';

  if target_credit_row.na then
    new_status := 'APPROVED';
  elsif required_doc_count = 0 then
    new_status := 'PENDING';
  elsif approved_doc_count >= required_doc_count then
    new_status := 'APPROVED';
  elsif target_credit_row.blocked_by is not null then
    new_status := 'PENDING'; -- No BLOCKED status in constraint, fallback to PENDING
  elsif approved_doc_count > 0 or total_completion > 0 then
    new_status := 'IN_PROGRESS';
  else
    new_status := 'PENDING';
  end if;

  update public.project_credits
  set completion_pct = case
      when required_doc_count = 0 then 100
      else round(total_completion / required_doc_count::numeric, 2)
    end,
    status = new_status
  where id = target_credit;

  return coalesce(new, old);
end;
$$;

drop trigger if exists tasks_recalculate_after_update on public.tasks;
create trigger tasks_recalculate_after_update
after insert or update or delete on public.tasks
for each row execute function public.recalculate_credit_completion();
