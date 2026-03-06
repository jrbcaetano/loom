-- Loom MVP foundation
-- 1) spaces
-- 2) space_memberships with admin/member role
-- 3) RLS policies
-- 4) RPC for safe space creation with initial admin membership

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'space_role'
  ) then
    create type public.space_role as enum ('admin', 'member');
  end if;
end $$;

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0 and char_length(name) <= 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.space_memberships (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.space_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create index if not exists idx_space_memberships_user_id on public.space_memberships (user_id);
create index if not exists idx_space_memberships_space_id on public.space_memberships (space_id);

alter table public.spaces enable row level security;
alter table public.space_memberships enable row level security;

create policy "users_can_view_their_spaces"
  on public.spaces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.space_memberships sm
      where sm.space_id = spaces.id
      and sm.user_id = auth.uid()
    )
  );

create policy "users_can_create_spaces"
  on public.spaces
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "space_admins_can_update_spaces"
  on public.spaces
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.space_memberships sm
      where sm.space_id = spaces.id
      and sm.user_id = auth.uid()
      and sm.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.space_memberships sm
      where sm.space_id = spaces.id
      and sm.user_id = auth.uid()
      and sm.role = 'admin'
    )
  );

create policy "space_admins_can_delete_spaces"
  on public.spaces
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.space_memberships sm
      where sm.space_id = spaces.id
      and sm.user_id = auth.uid()
      and sm.role = 'admin'
    )
  );

create policy "users_can_view_memberships_of_their_spaces"
  on public.space_memberships
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.space_memberships own_sm
      where own_sm.space_id = space_memberships.space_id
      and own_sm.user_id = auth.uid()
    )
  );

create policy "space_admins_can_insert_memberships"
  on public.space_memberships
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.space_memberships sm
      where sm.space_id = space_memberships.space_id
      and sm.user_id = auth.uid()
      and sm.role = 'admin'
    )
  );

create policy "space_admins_can_update_memberships"
  on public.space_memberships
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.space_memberships sm
      where sm.space_id = space_memberships.space_id
      and sm.user_id = auth.uid()
      and sm.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.space_memberships sm
      where sm.space_id = space_memberships.space_id
      and sm.user_id = auth.uid()
      and sm.role = 'admin'
    )
  );

create policy "space_admins_can_delete_memberships"
  on public.space_memberships
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.space_memberships sm
      where sm.space_id = space_memberships.space_id
      and sm.user_id = auth.uid()
      and sm.role = 'admin'
    )
  );

create or replace function public.create_space_with_admin_membership(space_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_space_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if space_name is null or char_length(trim(space_name)) = 0 then
    raise exception 'Space name is required';
  end if;

  insert into public.spaces (name, created_by)
  values (trim(space_name), current_user_id)
  returning id into new_space_id;

  insert into public.space_memberships (space_id, user_id, role)
  values (new_space_id, current_user_id, 'admin');

  return new_space_id;
end;
$$;

revoke all on function public.create_space_with_admin_membership(text) from public;
grant execute on function public.create_space_with_admin_membership(text) to authenticated;
