-- Fix RLS recursion on public.space_memberships
-- The initial policies referenced space_memberships from inside space_memberships policies,
-- which can trigger recursive policy evaluation in Postgres.

create or replace function public.is_space_member(target_space_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_memberships sm
    where sm.space_id = target_space_id
      and sm.user_id = target_user_id
  );
$$;

create or replace function public.is_space_admin(target_space_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_memberships sm
    where sm.space_id = target_space_id
      and sm.user_id = target_user_id
      and sm.role = 'admin'
  );
$$;

revoke all on function public.is_space_member(uuid, uuid) from public;
revoke all on function public.is_space_admin(uuid, uuid) from public;
grant execute on function public.is_space_member(uuid, uuid) to authenticated;
grant execute on function public.is_space_admin(uuid, uuid) to authenticated;

drop policy if exists "users_can_view_their_spaces" on public.spaces;
drop policy if exists "space_admins_can_update_spaces" on public.spaces;
drop policy if exists "space_admins_can_delete_spaces" on public.spaces;

drop policy if exists "users_can_view_memberships_of_their_spaces" on public.space_memberships;
drop policy if exists "space_admins_can_insert_memberships" on public.space_memberships;
drop policy if exists "space_admins_can_update_memberships" on public.space_memberships;
drop policy if exists "space_admins_can_delete_memberships" on public.space_memberships;

create policy "users_can_view_their_spaces"
  on public.spaces
  for select
  to authenticated
  using (public.is_space_member(id));

create policy "space_admins_can_update_spaces"
  on public.spaces
  for update
  to authenticated
  using (public.is_space_admin(id))
  with check (public.is_space_admin(id));

create policy "space_admins_can_delete_spaces"
  on public.spaces
  for delete
  to authenticated
  using (public.is_space_admin(id));

create policy "users_can_view_memberships_of_their_spaces"
  on public.space_memberships
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_space_member(space_id)
  );

create policy "space_admins_can_insert_memberships"
  on public.space_memberships
  for insert
  to authenticated
  with check (public.is_space_admin(space_id));

create policy "space_admins_can_update_memberships"
  on public.space_memberships
  for update
  to authenticated
  using (public.is_space_admin(space_id))
  with check (public.is_space_admin(space_id));

create policy "space_admins_can_delete_memberships"
  on public.space_memberships
  for delete
  to authenticated
  using (public.is_space_admin(space_id));
