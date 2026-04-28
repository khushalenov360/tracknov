alter table public.credits
  add column if not exists what_to_submit text not null default '',
  add column if not exists effort_level text check (effort_level in ('easy', 'moderate', 'hard')),
  add column if not exists effort_guidance text not null default '';

update public.credits
set
  what_to_submit = case
    when trim(coalesce(what_to_submit, '')) = '' then coalesce(documentation_summary, '')
    else what_to_submit
  end,
  effort_level = coalesce(effort_level, 'moderate'),
  effort_guidance = case
    when trim(coalesce(effort_guidance, '')) = '' then 'Typical effort. Confirm drawings, narrative, and calculations before final review.'
    else effort_guidance
  end
where true;
