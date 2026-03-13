-- Access invite provenance + activation workflow.
-- Supports:
-- - family-created pre-active invites
-- - self-registration capture without blocking signup
-- - product-admin activation/deactivation
-- - runtime app access check

alter table public.app_access_invites
  add column if not exists is_active boolean not null default false,
  add column if not exists activated_by uuid references auth.users(id) on delete set null,
  add column if not exists activated_at timestamptz,
  add column if not exists source_type text not null default 'product_admin',
  add column if not exists source_family_id uuid references public.families(id) on delete set null,
  add column if not exists source_created_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_access_invites_source_type_chk'
  ) then
    alter table public.app_access_invites
      add constraint app_access_invites_source_type_chk
      check (source_type in ('product_admin', 'family_invite', 'self_registration'));
  end if;
end $$;

-- Backfill existing rows:
-- pending/accepted invitations are active unless explicitly revoked.
update public.app_access_invites
set
  is_active = case when status = 'revoked'::public.app_access_invite_status then false else true end,
  activated_at = case
    when status = 'revoked'::public.app_access_invite_status then activated_at
    else coalesce(activated_at, now())
  end,
  activated_by = case
    when status = 'revoked'::public.app_access_invite_status then activated_by
    else coalesce(activated_by, invited_by)
  end
where true;

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
    is_active,
    invited_by,
    activated_by,
    activated_at,
    accepted_by,
    accepted_at,
    expires_at,
    source_type,
    source_family_id,
    source_created_by
  )
  values (
    normalized_email,
    'pending'::public.app_access_invite_status,
    true,
    current_user_id,
    current_user_id,
    now(),
    null,
    null,
    target_expires_at,
    'product_admin',
    null,
    current_user_id
  )
  on conflict ((lower(email)))
  do update
  set
    status = case
      when app_access_invites.status = 'revoked'::public.app_access_invite_status
        then 'revoked'::public.app_access_invite_status
      else app_access_invites.status
    end,
    is_active = true,
    invited_by = current_user_id,
    activated_by = current_user_id,
    activated_at = now(),
    expires_at = excluded.expires_at,
    source_type = 'product_admin',
    source_family_id = null,
    source_created_by = current_user_id,
    updated_at = now()
  returning id into invite_id;

  return invite_id;
end;
$$;

create or replace function public.upsert_app_access_invite_from_family(
  target_family_id uuid,
  target_email text
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

  if not public.can_manage_family(target_family_id, current_user_id) then
    raise exception 'Only family managers can create access requests';
  end if;

  normalized_email := lower(trim(coalesce(target_email, '')));
  if normalized_email = '' then
    raise exception 'Invite email is required';
  end if;

  insert into public.app_access_invites (
    email,
    status,
    is_active,
    invited_by,
    activated_by,
    activated_at,
    expires_at,
    source_type,
    source_family_id,
    source_created_by
  )
  values (
    normalized_email,
    'pending'::public.app_access_invite_status,
    false,
    current_user_id,
    null,
    null,
    null,
    'family_invite',
    target_family_id,
    current_user_id
  )
  on conflict ((lower(email)))
  do update
  set
    invited_by = current_user_id,
    source_type = 'family_invite',
    source_family_id = target_family_id,
    source_created_by = current_user_id,
    is_active = false,
    status = case
      when app_access_invites.status = 'revoked'::public.app_access_invite_status
        then 'revoked'::public.app_access_invite_status
      else app_access_invites.status
    end,
    updated_at = now()
  returning id into invite_id;

  return invite_id;
end;
$$;

create or replace function public.set_app_access_invite_active(
  target_invite_id uuid,
  target_is_active boolean
)
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
    is_active = target_is_active,
    activated_by = case when target_is_active then current_user_id else null end,
    activated_at = case when target_is_active then now() else null end,
    status = case
      when target_is_active and status = 'revoked'::public.app_access_invite_status
        then 'pending'::public.app_access_invite_status
      else status
    end,
    updated_at = now()
  where id = target_invite_id;

  if not found then
    raise exception 'Invite not found';
  end if;
end;
$$;

create or replace function public.delete_app_access_invite(target_invite_id uuid)
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

  delete from public.app_access_invites where id = target_invite_id;

  if not found then
    raise exception 'Invite not found';
  end if;
end;
$$;

create or replace function public.has_app_access(target_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  normalized_email text;
begin
  if target_user_id is null then
    return false;
  end if;

  if public.is_product_admin(target_user_id) then
    return true;
  end if;

  select lower(trim(coalesce(u.email, ''))) into normalized_email
  from auth.users u
  where u.id = target_user_id;

  if coalesce(normalized_email, '') = '' then
    return false;
  end if;

  return exists (
    select 1
    from public.app_access_invites ai
    where lower(ai.email) = normalized_email
      and ai.is_active = true
      and ai.status <> 'revoked'::public.app_access_invite_status
      and (ai.expires_at is null or ai.expires_at >= now())
  );
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

  if exists (
    select 1
    from public.app_access_invites ai
    where lower(ai.email) = normalized_email
  ) then
    update public.app_access_invites
    set
      status = case
        when status = 'revoked'::public.app_access_invite_status then status
        else 'accepted'::public.app_access_invite_status
      end,
      accepted_by = coalesce(accepted_by, new.id),
      accepted_at = coalesce(accepted_at, now()),
      updated_at = now()
    where lower(email) = normalized_email;
  else
    insert into public.app_access_invites (
      email,
      status,
      is_active,
      invited_by,
      accepted_by,
      accepted_at,
      source_type,
      source_family_id,
      source_created_by
    )
    values (
      normalized_email,
      'accepted'::public.app_access_invite_status,
      false,
      null,
      new.id,
      now(),
      'self_registration',
      null,
      new.id
    )
    on conflict ((lower(email)))
    do update
    set
      accepted_by = coalesce(app_access_invites.accepted_by, excluded.accepted_by),
      accepted_at = coalesce(app_access_invites.accepted_at, excluded.accepted_at),
      status = case
        when app_access_invites.status = 'revoked'::public.app_access_invite_status then app_access_invites.status
        else 'accepted'::public.app_access_invite_status
      end,
      source_type = case
        when app_access_invites.source_type = 'product_admin' then app_access_invites.source_type
        else 'self_registration'
      end,
      source_family_id = case
        when app_access_invites.source_type = 'family_invite' then app_access_invites.source_family_id
        else null
      end,
      source_created_by = coalesce(app_access_invites.source_created_by, new.id),
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_invite_gate on auth.users;
drop function if exists public.enforce_invite_only_signup();

grant execute on function public.upsert_app_access_invite_from_family(uuid, text) to authenticated;
grant execute on function public.set_app_access_invite_active(uuid, boolean) to authenticated;
grant execute on function public.delete_app_access_invite(uuid) to authenticated;
grant execute on function public.has_app_access(uuid) to authenticated;
