-- Space invite flow for admin-managed membership by email.
-- Admin creates pending email invites.
-- On user login/dashboard load, matching pending invites are claimed automatically.

create table if not exists public.space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  email text not null check (char_length(trim(email)) > 0 and char_length(email) <= 320),
  role public.space_role not null default 'member',
  invited_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_space_invites_space_id on public.space_invites(space_id);
create index if not exists idx_space_invites_email on public.space_invites(lower(email));

-- One active pending invite per space+email.
create unique index if not exists uq_space_invites_pending_space_email
  on public.space_invites(space_id, lower(email))
  where accepted_at is null;

alter table public.space_invites enable row level security;

drop policy if exists "space_admins_can_view_invites" on public.space_invites;
drop policy if exists "space_admins_can_insert_invites" on public.space_invites;
drop policy if exists "space_admins_can_delete_invites" on public.space_invites;

create policy "space_admins_can_view_invites"
  on public.space_invites
  for select
  to authenticated
  using (public.is_space_admin(space_id));

create policy "space_admins_can_insert_invites"
  on public.space_invites
  for insert
  to authenticated
  with check (
    public.is_space_admin(space_id)
    and invited_by = auth.uid()
  );

create policy "space_admins_can_delete_invites"
  on public.space_invites
  for delete
  to authenticated
  using (public.is_space_admin(space_id));

create or replace function public.claim_space_invites_for_current_user()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  claimed_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if current_user_email = '' then
    return 0;
  end if;

  with pending as (
    select si.id, si.space_id, si.role
    from public.space_invites si
    where si.accepted_at is null
      and lower(si.email) = current_user_email
  ),
  inserted as (
    insert into public.space_memberships (space_id, user_id, role)
    select p.space_id, current_user_id, p.role
    from pending p
    on conflict (space_id, user_id) do nothing
    returning space_id
  ),
  updated as (
    update public.space_invites si
    set accepted_at = now(),
        accepted_by = current_user_id
    where si.id in (select id from pending)
    returning 1
  )
  select count(*) into claimed_count from updated;

  return claimed_count;
end;
$$;

revoke all on function public.claim_space_invites_for_current_user() from public;
grant execute on function public.claim_space_invites_for_current_user() to authenticated;
