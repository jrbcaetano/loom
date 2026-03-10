-- Product admin and invite-only app access controls.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_access_invite_status') then
    create type public.app_access_invite_status as enum ('pending', 'accepted', 'revoked');
  end if;
end $$;

create table if not exists public.product_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_product_admins_set_updated_at on public.product_admins;
create trigger trg_product_admins_set_updated_at
before update on public.product_admins
for each row execute function public.set_updated_at();

create table if not exists public.app_access_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status public.app_access_invite_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_app_access_invites_email
  on public.app_access_invites (lower(email));

drop trigger if exists trg_app_access_invites_set_updated_at on public.app_access_invites;
create trigger trg_app_access_invites_set_updated_at
before update on public.app_access_invites
for each row execute function public.set_updated_at();

create or replace function public.normalize_app_access_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.email := lower(trim(coalesce(new.email, '')));

  if new.email = '' then
    raise exception 'Invite email is required';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_app_access_invites_normalize on public.app_access_invites;
create trigger trg_app_access_invites_normalize
before insert or update on public.app_access_invites
for each row execute function public.normalize_app_access_invite();

create or replace function public.is_product_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.product_admins pa
    where pa.user_id = target_user_id
      and pa.is_active = true
  );
$$;

create or replace function public.upsert_app_access_invite(
  target_email text,
  target_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text;
  invite_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_product_admin(current_user_id) then
    raise exception 'Only product admins can manage app access invites';
  end if;

  normalized_email := lower(trim(coalesce(target_email, '')));

  if normalized_email = '' then
    raise exception 'Invite email is required';
  end if;

  insert into public.app_access_invites (
    email,
    status,
    invited_by,
    accepted_by,
    accepted_at,
    expires_at
  )
  values (
    normalized_email,
    'pending'::public.app_access_invite_status,
    current_user_id,
    null,
    null,
    target_expires_at
  )
  on conflict ((lower(email)))
  do update
  set
    status = 'pending'::public.app_access_invite_status,
    invited_by = current_user_id,
    accepted_by = null,
    accepted_at = null,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning id into invite_id;

  return invite_id;
end;
$$;

create or replace function public.revoke_app_access_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_product_admin(current_user_id) then
    raise exception 'Only product admins can manage app access invites';
  end if;

  update public.app_access_invites
  set
    status = 'revoked'::public.app_access_invite_status,
    updated_at = now()
  where id = target_invite_id;

  if not found then
    raise exception 'Invite not found';
  end if;
end;
$$;

create or replace function public.enforce_invite_only_signup()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text := lower(trim(coalesce(new.email, '')));
begin
  if normalized_email = '' then
    raise exception 'Email is required';
  end if;

  if not exists (
    select 1
    from public.app_access_invites ai
    where lower(ai.email) = normalized_email
      and ai.status = 'pending'::public.app_access_invite_status
      and (ai.expires_at is null or ai.expires_at >= now())
  ) then
    raise exception 'Registration is invite-only. Ask a product admin for access.';
  end if;

  return new;
end;
$$;

create or replace function public.mark_app_access_invite_claimed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(new.email, '')));
begin
  if normalized_email = '' then
    return new;
  end if;

  update public.app_access_invites
  set
    status = 'accepted'::public.app_access_invite_status,
    accepted_by = new.id,
    accepted_at = coalesce(accepted_at, now()),
    updated_at = now()
  where lower(email) = normalized_email
    and status = 'pending'::public.app_access_invite_status
    and (expires_at is null or expires_at >= now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_invite_gate on auth.users;
create trigger on_auth_user_invite_gate
before insert on auth.users
for each row execute function public.enforce_invite_only_signup();

drop trigger if exists zz_on_auth_user_access_invite_claimed on auth.users;
create trigger zz_on_auth_user_access_invite_claimed
after insert on auth.users
for each row execute function public.mark_app_access_invite_claimed();

alter table public.product_admins enable row level security;
alter table public.app_access_invites enable row level security;

drop policy if exists "product_admins_select" on public.product_admins;
drop policy if exists "product_admins_insert" on public.product_admins;
drop policy if exists "product_admins_update" on public.product_admins;
drop policy if exists "product_admins_delete" on public.product_admins;

create policy "product_admins_select"
on public.product_admins
for select to authenticated
using (public.is_product_admin());

create policy "product_admins_insert"
on public.product_admins
for insert to authenticated
with check (public.is_product_admin());

create policy "product_admins_update"
on public.product_admins
for update to authenticated
using (public.is_product_admin())
with check (public.is_product_admin());

create policy "product_admins_delete"
on public.product_admins
for delete to authenticated
using (public.is_product_admin());

drop policy if exists "app_access_invites_select" on public.app_access_invites;
drop policy if exists "app_access_invites_insert" on public.app_access_invites;
drop policy if exists "app_access_invites_update" on public.app_access_invites;
drop policy if exists "app_access_invites_delete" on public.app_access_invites;

create policy "app_access_invites_select"
on public.app_access_invites
for select to authenticated
using (public.is_product_admin());

create policy "app_access_invites_insert"
on public.app_access_invites
for insert to authenticated
with check (public.is_product_admin());

create policy "app_access_invites_update"
on public.app_access_invites
for update to authenticated
using (public.is_product_admin())
with check (public.is_product_admin());

create policy "app_access_invites_delete"
on public.app_access_invites
for delete to authenticated
using (public.is_product_admin());

grant select, insert, update, delete on public.product_admins to authenticated;
grant select, insert, update, delete on public.app_access_invites to authenticated;

grant execute on function public.is_product_admin(uuid) to authenticated;
grant execute on function public.upsert_app_access_invite(text, timestamptz) to authenticated;
grant execute on function public.revoke_app_access_invite(uuid) to authenticated;



insert into public.product_admins (user_id, is_active)
select id, true
from auth.users
where lower(email) = lower('jrcaetano@gmail.com')
on conflict (user_id) do update
set is_active = excluded.is_active, updated_at = now();

