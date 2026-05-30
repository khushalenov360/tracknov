-- Backfill existing projects with a rating_system_id and map credits to templates

do $$
declare
  default_rs_id uuid;
begin
  -- Get the default rating system
  select id into default_rs_id from public.rating_systems 
  where name = 'IGBC Green Interiors' and version = 'v2' 
  limit 1;

  if default_rs_id is not null then
    -- Update existing projects
    update public.projects
    set rating_system_id = default_rs_id,
        state = case 
          when status = 'active' then 'ACTIVE'
          when status = 'completed' then 'APPROVED'
          else 'DRAFT'
        end
    where rating_system_id is null;

    -- Map existing project_credits to templates where possible
    update public.project_credits pc
    set 
      credit_template_id = ct.id,
      credit_code = ct.code,
      credit_name = ct.name,
      category_id = ct.category_id,
      category_name = cc.name,
      max_points = ct.max_points
    from public.credits c
    join public.credit_templates ct on ct.code = c.credit_code
    join public.credit_categories cc on cc.id = ct.category_id
    where pc.credit_id = c.id
      and ct.rating_system_id = default_rs_id;
  end if;
end $$;
