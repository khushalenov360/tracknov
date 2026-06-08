create table if not exists public.platform_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null,
  token text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.platform_invites enable row level security;

create policy "platform_invites_select"
on public.platform_invites for select
to authenticated
using (true);

create policy "platform_invites_insert_admin"
on public.platform_invites for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('super_user', 'super_admin', 'L5', 'L3')
  )
);

create policy "platform_invites_update_admin"
on public.platform_invites for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('super_user', 'super_admin', 'L5', 'L3')
  )
);

-- Note: No anonymous access policies needed as server actions will bypass RLS via service role
