-- Project state transition rules and locking
create or replace function public.handle_project_state_change()
returns trigger
language plpgsql
as $$
begin
  -- Trigger: SUBMITTED_TO_IGBC -> Full project lock
  if new.state = 'SUBMITTED_TO_IGBC' and old.state is distinct from new.state then
    new.lock_flag := true;
    new.submission_flag := true;
  end if;

  -- Unlock via Admin override only (handled by role check in service layer, 
  -- but we ensure lock_flag is consistent)
  if new.state = 'CLARIFICATION' and old.state = 'SUBMITTED_TO_IGBC' then
    new.lock_flag := false;
  end if;

  return new;
end;
$$;

drop trigger if exists project_state_trigger on public.projects;
create trigger project_state_trigger
before update on public.projects
for each row execute function public.handle_project_state_change();
