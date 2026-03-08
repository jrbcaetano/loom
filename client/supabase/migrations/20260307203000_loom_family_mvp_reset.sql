-- Loom Family MVP reset migration
-- Replaces previous space-domain PoC with family-domain model.

create extension if not exists pgcrypto;

-- Cleanup previous domain objects
 drop function if exists public.claim_space_invites_for_current_user() cascade;
 drop function if exists public.create_space_with_admin_membership(text) cascade;
 drop function if exists public.is_space_admin(uuid, uuid) cascade;
 drop function if exists public.is_space_member(uuid, uuid) cascade;

 drop table if exists public.space_invites cascade;
 drop table if exists public.space_memberships cascade;
 drop table if exists public.spaces cascade;
 drop type if exists public.space_role cascade;

-- Hard reset Loom domain objects to avoid schema drift from previous PoCs.
drop table if exists public.notifications cascade;
drop table if exists public.entity_shares cascade;
drop table if exists public.events cascade;
drop table if exists public.tasks cascade;
drop table if exists public.list_items cascade;
drop table if exists public.lists cascade;
drop table if exists public.user_settings cascade;
drop table if exists public.family_members cascade;
drop table if exists public.families cascade;
drop table if exists public.profiles cascade;

drop trigger if exists on_auth_user_created on auth.users;

drop type if exists public.notification_type cascade;
drop type if exists public.share_permission cascade;
drop type if exists public.entity_type cascade;
drop type if exists public.task_priority cascade;
drop type if exists public.task_status cascade;
drop type if exists public.visibility_level cascade;
drop type if exists public.member_status cascade;
drop type if exists public.family_role cascade;

-- Enums
 do $$
 begin
   if not exists (select 1 from pg_type where typname = 'family_role') then
     create type public.family_role as enum ('admin', 'adult', 'child');
   end if;
   if not exists (select 1 from pg_type where typname = 'member_status') then
     create type public.member_status as enum ('active', 'invited', 'inactive');
   end if;
   if not exists (select 1 from pg_type where typname = 'visibility_level') then
     create type public.visibility_level as enum ('private', 'family', 'selected_members');
   end if;
   if not exists (select 1 from pg_type where typname = 'task_status') then
     create type public.task_status as enum ('todo', 'doing', 'done');
   end if;
   if not exists (select 1 from pg_type where typname = 'task_priority') then
     create type public.task_priority as enum ('low', 'medium', 'high');
   end if;
   if not exists (select 1 from pg_type where typname = 'entity_type') then
     create type public.entity_type as enum ('list', 'task', 'event');
   end if;
   if not exists (select 1 from pg_type where typname = 'share_permission') then
     create type public.share_permission as enum ('view', 'edit');
   end if;
   if not exists (select 1 from pg_type where typname = 'notification_type') then
     create type public.notification_type as enum ('task_assigned', 'list_shared', 'event_created', 'general');
   end if;
 end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  preferred_locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_profiles_email on public.profiles (lower(email)) where email is not null;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_families_set_updated_at on public.families;
create trigger trg_families_set_updated_at before update on public.families for each row execute function public.set_updated_at();

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role public.family_role not null default 'adult',
  status public.member_status not null default 'active',
  invited_email text,
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_members_user_or_email_chk check (user_id is not null or invited_email is not null)
);

create unique index if not exists uq_family_members_active_user on public.family_members (family_id, user_id) where user_id is not null;
create unique index if not exists uq_family_members_invited_email on public.family_members (family_id, lower(invited_email)) where invited_email is not null;
create index if not exists idx_family_members_user_id on public.family_members(user_id);
create index if not exists idx_family_members_family_id on public.family_members(family_id);

drop trigger if exists trg_family_members_set_updated_at on public.family_members;
create trigger trg_family_members_set_updated_at before update on public.family_members for each row execute function public.set_updated_at();

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  active_family_id uuid references public.families(id) on delete set null,
  theme text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_settings_set_updated_at on public.user_settings;
create trigger trg_user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  visibility public.visibility_level not null default 'family',
  archived boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_lists_set_updated_at on public.lists;
create trigger trg_lists_set_updated_at before update on public.lists for each row execute function public.set_updated_at();

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 240),
  quantity text,
  category text,
  is_completed boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_list_items_set_updated_at on public.list_items;
create trigger trg_list_items_set_updated_at before update on public.list_items for each row execute function public.set_updated_at();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_at timestamptz,
  visibility public.visibility_level not null default 'family',
  archived boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tasks_set_updated_at on public.tasks;
create trigger trg_tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  all_day boolean not null default false,
  visibility public.visibility_level not null default 'family',
  archived boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_chk check (end_at >= start_at)
);

drop trigger if exists trg_events_set_updated_at on public.events;
create trigger trg_events_set_updated_at before update on public.events for each row execute function public.set_updated_at();

create table if not exists public.entity_shares (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  entity_type public.entity_type not null,
  entity_id uuid not null,
  shared_with_user_id uuid not null references public.profiles(id) on delete cascade,
  permission public.share_permission not null default 'view',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, shared_with_user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_id uuid references public.families(id) on delete cascade,
  type public.notification_type not null default 'general',
  title text not null,
  body text,
  related_entity_type public.entity_type,
  related_entity_id uuid,
  actor_user_id uuid references public.profiles(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Compatibility repair for pre-existing manual schemas.
-- Some users may already have entity_shares/notifications without family_id.
alter table public.entity_shares
  add column if not exists family_id uuid;

alter table public.notifications
  add column if not exists family_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'entity_shares_family_id_fkey'
      and conrelid = 'public.entity_shares'::regclass
  ) then
    alter table public.entity_shares
      add constraint entity_shares_family_id_fkey
      foreign key (family_id)
      references public.families(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_family_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_family_id_fkey
      foreign key (family_id)
      references public.families(id)
      on delete cascade;
  end if;
end $$;

update public.entity_shares es
set family_id = case
  when es.entity_type = 'list' then (select l.family_id from public.lists l where l.id = es.entity_id)
  when es.entity_type = 'task' then (select t.family_id from public.tasks t where t.id = es.entity_id)
  when es.entity_type = 'event' then (select e.family_id from public.events e where e.id = es.entity_id)
  else null
end
where es.family_id is null;

create index if not exists idx_lists_family_id on public.lists(family_id);
create index if not exists idx_lists_owner_user_id on public.lists(owner_user_id);
create index if not exists idx_lists_visibility on public.lists(visibility);
create index if not exists idx_list_items_list_id on public.list_items(list_id);
create index if not exists idx_list_items_sort_order on public.list_items(list_id, sort_order);
create index if not exists idx_tasks_family_id on public.tasks(family_id);
create index if not exists idx_tasks_owner_user_id on public.tasks(owner_user_id);
create index if not exists idx_tasks_assigned_to_user_id on public.tasks(assigned_to_user_id);
create index if not exists idx_tasks_due_at on public.tasks(due_at);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_events_family_id on public.events(family_id);
create index if not exists idx_events_start_at on public.events(start_at);
create index if not exists idx_entity_shares_lookup on public.entity_shares(entity_type, entity_id, shared_with_user_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id, is_read, created_at desc);

-- Membership and permission helper functions
create or replace function public.is_active_family_member(target_family_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = target_user_id
      and fm.status = 'active'
  );
$$;

create or replace function public.can_manage_family(target_family_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = target_user_id
      and fm.status = 'active'
      and fm.role = 'admin'
  );
$$;

create or replace function public.can_contribute_family(target_family_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = target_user_id
      and fm.status = 'active'
      and fm.role in ('admin', 'adult')
  );
$$;

create or replace function public.users_share_active_family(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members a
    join public.family_members b on a.family_id = b.family_id
    where a.user_id = user_a
      and b.user_id = user_b
      and a.status = 'active'
      and b.status = 'active'
  );
$$;

create or replace function public.can_view_entity(target_entity_type public.entity_type, target_entity_id uuid, target_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_owner_user_id uuid;
  v_visibility public.visibility_level;
begin
  if target_user_id is null then
    return false;
  end if;

  case target_entity_type
    when 'list' then
      select family_id, owner_user_id, visibility into v_family_id, v_owner_user_id, v_visibility
      from public.lists where id = target_entity_id;
    when 'task' then
      select family_id, owner_user_id, visibility into v_family_id, v_owner_user_id, v_visibility
      from public.tasks where id = target_entity_id;
    when 'event' then
      select family_id, owner_user_id, visibility into v_family_id, v_owner_user_id, v_visibility
      from public.events where id = target_entity_id;
    else
      return false;
  end case;

  if v_family_id is null then
    return false;
  end if;

  if not public.is_active_family_member(v_family_id, target_user_id) then
    return false;
  end if;

  if v_owner_user_id = target_user_id then
    return true;
  end if;

  if v_visibility = 'family' then
    return true;
  end if;

  if v_visibility = 'selected_members' then
    return exists (
      select 1
      from public.entity_shares es
      where es.entity_type = target_entity_type
        and es.entity_id = target_entity_id
        and es.shared_with_user_id = target_user_id
    );
  end if;

  return false;
end;
$$;

create or replace function public.can_edit_entity(target_entity_type public.entity_type, target_entity_id uuid, target_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_owner_user_id uuid;
  v_visibility public.visibility_level;
begin
  if target_user_id is null then
    return false;
  end if;

  case target_entity_type
    when 'list' then
      select family_id, owner_user_id, visibility into v_family_id, v_owner_user_id, v_visibility
      from public.lists where id = target_entity_id;
    when 'task' then
      select family_id, owner_user_id, visibility into v_family_id, v_owner_user_id, v_visibility
      from public.tasks where id = target_entity_id;
    when 'event' then
      select family_id, owner_user_id, visibility into v_family_id, v_owner_user_id, v_visibility
      from public.events where id = target_entity_id;
    else
      return false;
  end case;

  if v_family_id is null then
    return false;
  end if;

  if not public.is_active_family_member(v_family_id, target_user_id) then
    return false;
  end if;

  if v_owner_user_id = target_user_id then
    return true;
  end if;

  if v_visibility = 'family' then
    return public.can_contribute_family(v_family_id, target_user_id);
  end if;

  if v_visibility = 'selected_members' then
    return exists (
      select 1
      from public.entity_shares es
      where es.entity_type = target_entity_type
        and es.entity_id = target_entity_id
        and es.shared_with_user_id = target_user_id
        and es.permission = 'edit'
    );
  end if;

  return false;
end;
$$;

create or replace function public.validate_entity_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_visibility public.visibility_level;
begin
  case new.entity_type
    when 'list' then
      select family_id, visibility into v_family_id, v_visibility from public.lists where id = new.entity_id;
    when 'task' then
      select family_id, visibility into v_family_id, v_visibility from public.tasks where id = new.entity_id;
    when 'event' then
      select family_id, visibility into v_family_id, v_visibility from public.events where id = new.entity_id;
    else
      raise exception 'Unsupported entity type';
  end case;

  if v_family_id is null then
    raise exception 'Shared entity not found';
  end if;

  if v_visibility <> 'selected_members' then
    raise exception 'Entity shares require selected_members visibility';
  end if;

  if not public.is_active_family_member(v_family_id, new.shared_with_user_id) then
    raise exception 'Shared user must be active family member';
  end if;

  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  new.family_id := v_family_id;
  return new;
end;
$$;

drop trigger if exists trg_entity_shares_validate on public.entity_shares;
create trigger trg_entity_shares_validate before insert or update on public.entity_shares for each row execute function public.validate_entity_share();

-- Auth profile sync
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_auth_user_created();

insert into public.profiles (id, email, full_name)
select
  u.id,
  lower(u.email),
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(u.email, ''), '@', 1)
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- RPCs
create or replace function public.create_family_with_admin(family_name text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  new_family_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if family_name is null or char_length(trim(family_name)) = 0 then
    raise exception 'Family name is required';
  end if;

  insert into public.profiles (id, email, full_name)
  select u.id, lower(u.email), split_part(coalesce(u.email, ''), '@', 1)
  from auth.users u
  where u.id = current_user_id
  on conflict (id) do nothing;

  insert into public.families (name, created_by)
  values (trim(family_name), current_user_id)
  returning id into new_family_id;

  insert into public.family_members (
    family_id, user_id, role, status, invited_email, invited_by, joined_at
  ) values (
    new_family_id, current_user_id, 'admin', 'active', lower(auth.jwt() ->> 'email'), current_user_id, now()
  );

  insert into public.user_settings (user_id, active_family_id)
  values (current_user_id, new_family_id)
  on conflict (user_id) do update set active_family_id = excluded.active_family_id, updated_at = now();

  return new_family_id;
end;
$$;

create or replace function public.invite_family_member(
  target_family_id uuid,
  invite_email text,
  invite_role public.family_role default 'adult'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text;
  existing_profile_id uuid;
  membership_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not public.can_manage_family(target_family_id, current_user_id) then
    raise exception 'Only admins can invite members';
  end if;

  normalized_email := lower(trim(coalesce(invite_email, '')));
  if normalized_email = '' then
    raise exception 'Invite email is required';
  end if;

  select p.id into existing_profile_id
  from public.profiles p
  where lower(p.email) = normalized_email
  limit 1;

  select fm.id into membership_id
  from public.family_members fm
  where fm.family_id = target_family_id
    and (
      (existing_profile_id is not null and fm.user_id = existing_profile_id)
      or lower(coalesce(fm.invited_email, '')) = normalized_email
    )
  limit 1;

  if membership_id is null then
    insert into public.family_members (family_id, user_id, role, status, invited_email, invited_by, joined_at)
    values (
      target_family_id,
      existing_profile_id,
      invite_role,
      case
        when existing_profile_id is null then 'invited'::public.member_status
        else 'active'::public.member_status
      end,
      normalized_email,
      current_user_id,
      case when existing_profile_id is null then null else now() end
    )
    returning id into membership_id;
  else
    update public.family_members
    set role = invite_role,
        user_id = coalesce(user_id, existing_profile_id),
        status = case
          when coalesce(user_id, existing_profile_id) is null then 'invited'::public.member_status
          else 'active'::public.member_status
        end,
        invited_email = normalized_email,
        invited_by = current_user_id,
        joined_at = case when coalesce(user_id, existing_profile_id) is null then joined_at else coalesce(joined_at, now()) end,
        updated_at = now()
    where id = membership_id;
  end if;

  return membership_id;
end;
$$;

create or replace function public.claim_family_invites_for_current_user()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  claimed_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if current_email = '' then
    return 0;
  end if;

  with claimed as (
    update public.family_members fm
    set user_id = current_user_id,
        status = 'active'::public.member_status,
        invited_email = current_email,
        joined_at = coalesce(joined_at, now()),
        updated_at = now()
    where fm.user_id is null
      and fm.status = 'invited'
      and lower(coalesce(fm.invited_email, '')) = current_email
      and not exists (
        select 1 from public.family_members existing_member
        where existing_member.family_id = fm.family_id
          and existing_member.user_id = current_user_id
      )
    returning 1
  )
  select count(*) into claimed_count from claimed;

  insert into public.user_settings (user_id, active_family_id)
  select current_user_id, fm.family_id
  from public.family_members fm
  where fm.user_id = current_user_id
    and fm.status = 'active'
  order by coalesce(fm.joined_at, fm.created_at)
  limit 1
  on conflict (user_id) do nothing;

  return claimed_count;
end;
$$;

create or replace function public.set_active_family(target_family_id uuid)
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

  if target_family_id is not null and not public.is_active_family_member(target_family_id, current_user_id) then
    raise exception 'You are not a member of this family';
  end if;

  insert into public.user_settings (user_id, active_family_id)
  values (current_user_id, target_family_id)
  on conflict (user_id) do update set active_family_id = excluded.active_family_id, updated_at = now();
end;
$$;

-- Notifications helpers
create or replace function public.insert_notification(
  p_user_id uuid,
  p_family_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text default null,
  p_related_entity_type public.entity_type default null,
  p_related_entity_id uuid default null,
  p_actor_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (
    user_id,
    family_id,
    type,
    title,
    body,
    related_entity_type,
    related_entity_id,
    actor_user_id
  )
  values (
    p_user_id,
    p_family_id,
    p_type,
    p_title,
    p_body,
    p_related_entity_type,
    p_related_entity_id,
    p_actor_user_id
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.create_task_with_shares(
  target_family_id uuid,
  task_title text,
  task_description text default null,
  task_status_value public.task_status default 'todo',
  task_priority_value public.task_priority default 'medium',
  task_due_at timestamptz default null,
  task_assigned_to_user_id uuid default null,
  task_visibility public.visibility_level default 'family',
  selected_member_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_task_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if target_family_id is null then
    raise exception 'Family is required';
  end if;

  if not public.is_active_family_member(target_family_id, current_user_id) then
    raise exception 'You are not an active member of this family';
  end if;

  if task_title is null or char_length(trim(task_title)) = 0 then
    raise exception 'Task title is required';
  end if;

  if task_assigned_to_user_id is not null and not public.is_active_family_member(target_family_id, task_assigned_to_user_id) then
    raise exception 'Assignee must be an active family member';
  end if;

  insert into public.tasks (
    family_id,
    owner_user_id,
    assigned_to_user_id,
    title,
    description,
    status,
    priority,
    due_at,
    visibility,
    created_by,
    updated_by
  )
  values (
    target_family_id,
    current_user_id,
    task_assigned_to_user_id,
    trim(task_title),
    task_description,
    task_status_value,
    task_priority_value,
    task_due_at,
    task_visibility,
    current_user_id,
    current_user_id
  )
  returning id into new_task_id;

  if task_visibility = 'selected_members' then
    insert into public.entity_shares (
      family_id,
      entity_type,
      entity_id,
      shared_with_user_id,
      permission,
      created_by
    )
    select
      target_family_id,
      'task',
      new_task_id,
      member_id,
      'edit',
      current_user_id
    from unnest(coalesce(selected_member_ids, array[]::uuid[])) as member_id
    on conflict (entity_type, entity_id, shared_with_user_id) do nothing;
  end if;

  return new_task_id;
end;
$$;

create or replace function public.create_list_with_shares(
  target_family_id uuid,
  list_title text,
  list_description text default null,
  list_visibility public.visibility_level default 'family',
  selected_member_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_list_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if target_family_id is null then
    raise exception 'Family is required';
  end if;

  if not public.is_active_family_member(target_family_id, current_user_id) then
    raise exception 'You are not an active member of this family';
  end if;

  if list_title is null or char_length(trim(list_title)) = 0 then
    raise exception 'List title is required';
  end if;

  insert into public.lists (
    family_id,
    owner_user_id,
    title,
    description,
    visibility,
    created_by,
    updated_by
  )
  values (
    target_family_id,
    current_user_id,
    trim(list_title),
    list_description,
    list_visibility,
    current_user_id,
    current_user_id
  )
  returning id into new_list_id;

  if list_visibility = 'selected_members' then
    insert into public.entity_shares (
      family_id,
      entity_type,
      entity_id,
      shared_with_user_id,
      permission,
      created_by
    )
    select
      target_family_id,
      'list',
      new_list_id,
      member_id,
      'edit',
      current_user_id
    from unnest(coalesce(selected_member_ids, array[]::uuid[])) as member_id
    on conflict (entity_type, entity_id, shared_with_user_id) do nothing;
  end if;

  return new_list_id;
end;
$$;

create or replace function public.notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to_user_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.assigned_to_user_id is not distinct from new.assigned_to_user_id then
    return new;
  end if;

  if new.assigned_to_user_id <> new.owner_user_id then
    perform public.insert_notification(
      new.assigned_to_user_id,
      new.family_id,
      'task_assigned',
      'Task assigned',
      new.title,
      'task',
      new.id,
      new.owner_user_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tasks_notify_assignment on public.tasks;
create trigger trg_tasks_notify_assignment after insert or update of assigned_to_user_id on public.tasks
for each row execute function public.notify_task_assignment();

create or replace function public.notify_list_shared()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list_title text;
begin
  if new.entity_type <> 'list' then
    return new;
  end if;

  select l.title into v_list_title from public.lists l where l.id = new.entity_id;

  if new.shared_with_user_id <> new.created_by then
    perform public.insert_notification(
      new.shared_with_user_id,
      new.family_id,
      'list_shared',
      'List shared with you',
      coalesce(v_list_title, 'A list'),
      'list',
      new.entity_id,
      new.created_by
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_entity_shares_notify_list_shared on public.entity_shares;
create trigger trg_entity_shares_notify_list_shared after insert on public.entity_shares
for each row execute function public.notify_list_shared();

create or replace function public.notify_event_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    user_id, family_id, type, title, body, related_entity_type, related_entity_id, actor_user_id
  )
  select
    fm.user_id,
    new.family_id,
    'event_created',
    'New family event',
    new.title,
    'event',
    new.id,
    new.owner_user_id
  from public.family_members fm
  where fm.family_id = new.family_id
    and fm.status = 'active'
    and fm.user_id is not null
    and fm.user_id <> new.owner_user_id;

  return new;
end;
$$;

drop trigger if exists trg_events_notify_created on public.events;
create trigger trg_events_notify_created after insert on public.events
for each row execute function public.notify_event_created();

-- RLS
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.user_settings enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.entity_shares enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_select" on public.profiles for select to authenticated
using (id = auth.uid() or public.users_share_active_family(id, auth.uid()));

create policy "profiles_insert" on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy "profiles_update" on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "families_select" on public.families;
drop policy if exists "families_insert" on public.families;
drop policy if exists "families_update" on public.families;
drop policy if exists "families_delete" on public.families;

create policy "families_select" on public.families for select to authenticated
using (public.is_active_family_member(id));

create policy "families_insert" on public.families for insert to authenticated
with check (created_by = auth.uid());

create policy "families_update" on public.families for update to authenticated
using (public.can_manage_family(id))
with check (public.can_manage_family(id));

create policy "families_delete" on public.families for delete to authenticated
using (public.can_manage_family(id));

drop policy if exists "family_members_select" on public.family_members;
drop policy if exists "family_members_insert" on public.family_members;
drop policy if exists "family_members_update" on public.family_members;
drop policy if exists "family_members_delete" on public.family_members;

create policy "family_members_select" on public.family_members for select to authenticated
using (public.is_active_family_member(family_id));

create policy "family_members_insert" on public.family_members for insert to authenticated
with check (public.can_manage_family(family_id));

create policy "family_members_update" on public.family_members for update to authenticated
using (public.can_manage_family(family_id))
with check (public.can_manage_family(family_id));

create policy "family_members_delete" on public.family_members for delete to authenticated
using (public.can_manage_family(family_id));

drop policy if exists "user_settings_select" on public.user_settings;
drop policy if exists "user_settings_insert" on public.user_settings;
drop policy if exists "user_settings_update" on public.user_settings;
drop policy if exists "user_settings_delete" on public.user_settings;

create policy "user_settings_select" on public.user_settings for select to authenticated
using (user_id = auth.uid());

create policy "user_settings_insert" on public.user_settings for insert to authenticated
with check (user_id = auth.uid() and (active_family_id is null or public.is_active_family_member(active_family_id, auth.uid())));

create policy "user_settings_update" on public.user_settings for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and (active_family_id is null or public.is_active_family_member(active_family_id, auth.uid())));

create policy "user_settings_delete" on public.user_settings for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "lists_select" on public.lists;
drop policy if exists "lists_insert" on public.lists;
drop policy if exists "lists_update" on public.lists;
drop policy if exists "lists_delete" on public.lists;

create policy "lists_select" on public.lists for select to authenticated
using (public.can_view_entity('list', id));

create policy "lists_insert" on public.lists for insert to authenticated
with check (owner_user_id = auth.uid() and created_by = auth.uid() and public.is_active_family_member(family_id));

create policy "lists_update" on public.lists for update to authenticated
using (public.can_edit_entity('list', id))
with check (public.can_edit_entity('list', id));

create policy "lists_delete" on public.lists for delete to authenticated
using (public.can_edit_entity('list', id));

drop policy if exists "list_items_select" on public.list_items;
drop policy if exists "list_items_insert" on public.list_items;
drop policy if exists "list_items_update" on public.list_items;
drop policy if exists "list_items_delete" on public.list_items;

create policy "list_items_select" on public.list_items for select to authenticated
using (public.can_view_entity('list', list_id));

create policy "list_items_insert" on public.list_items for insert to authenticated
with check (public.can_edit_entity('list', list_id));

create policy "list_items_update" on public.list_items for update to authenticated
using (public.can_edit_entity('list', list_id))
with check (public.can_edit_entity('list', list_id));

create policy "list_items_delete" on public.list_items for delete to authenticated
using (public.can_edit_entity('list', list_id));

drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;

create policy "tasks_select" on public.tasks for select to authenticated
using (public.can_view_entity('task', id));

create policy "tasks_insert" on public.tasks for insert to authenticated
with check (
  owner_user_id = auth.uid()
  and created_by = auth.uid()
  and public.is_active_family_member(family_id)
  and (assigned_to_user_id is null or public.is_active_family_member(family_id, assigned_to_user_id))
);

create policy "tasks_update" on public.tasks for update to authenticated
using (public.can_edit_entity('task', id))
with check (public.can_edit_entity('task', id));

create policy "tasks_delete" on public.tasks for delete to authenticated
using (public.can_edit_entity('task', id));

drop policy if exists "events_select" on public.events;
drop policy if exists "events_insert" on public.events;
drop policy if exists "events_update" on public.events;
drop policy if exists "events_delete" on public.events;

create policy "events_select" on public.events for select to authenticated
using (public.can_view_entity('event', id));

create policy "events_insert" on public.events for insert to authenticated
with check (owner_user_id = auth.uid() and created_by = auth.uid() and public.is_active_family_member(family_id));

create policy "events_update" on public.events for update to authenticated
using (public.can_edit_entity('event', id))
with check (public.can_edit_entity('event', id));

create policy "events_delete" on public.events for delete to authenticated
using (public.can_edit_entity('event', id));

drop policy if exists "entity_shares_select" on public.entity_shares;
drop policy if exists "entity_shares_insert" on public.entity_shares;
drop policy if exists "entity_shares_update" on public.entity_shares;
drop policy if exists "entity_shares_delete" on public.entity_shares;

create policy "entity_shares_select" on public.entity_shares for select to authenticated
using (shared_with_user_id = auth.uid() or public.can_edit_entity(entity_type, entity_id));

create policy "entity_shares_insert" on public.entity_shares for insert to authenticated
with check (created_by = auth.uid() and public.can_edit_entity(entity_type, entity_id));

create policy "entity_shares_update" on public.entity_shares for update to authenticated
using (public.can_edit_entity(entity_type, entity_id))
with check (public.can_edit_entity(entity_type, entity_id));

create policy "entity_shares_delete" on public.entity_shares for delete to authenticated
using (public.can_edit_entity(entity_type, entity_id));

drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;
drop policy if exists "notifications_delete" on public.notifications;

create policy "notifications_select" on public.notifications for select to authenticated
using (user_id = auth.uid());

create policy "notifications_update" on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "notifications_delete" on public.notifications for delete to authenticated
using (user_id = auth.uid());

-- Grants
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.families to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.list_items to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.entity_shares to authenticated;
grant select, update, delete on public.notifications to authenticated;

grant execute on function public.is_active_family_member(uuid, uuid) to authenticated;
grant execute on function public.can_manage_family(uuid, uuid) to authenticated;
grant execute on function public.can_contribute_family(uuid, uuid) to authenticated;
grant execute on function public.users_share_active_family(uuid, uuid) to authenticated;
grant execute on function public.can_view_entity(public.entity_type, uuid, uuid) to authenticated;
grant execute on function public.can_edit_entity(public.entity_type, uuid, uuid) to authenticated;
grant execute on function public.create_family_with_admin(text) to authenticated;
grant execute on function public.invite_family_member(uuid, text, public.family_role) to authenticated;
grant execute on function public.claim_family_invites_for_current_user() to authenticated;
grant execute on function public.set_active_family(uuid) to authenticated;
grant execute on function public.create_task_with_shares(uuid, text, text, public.task_status, public.task_priority, timestamptz, uuid, public.visibility_level, uuid[]) to authenticated;
grant execute on function public.create_list_with_shares(uuid, text, text, public.visibility_level, uuid[]) to authenticated;

-- Realtime
alter table public.lists replica identity full;
alter table public.list_items replica identity full;
alter table public.tasks replica identity full;
alter table public.events replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lists') then
      alter publication supabase_realtime add table public.lists;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='list_items') then
      alter publication supabase_realtime add table public.list_items;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tasks') then
      alter publication supabase_realtime add table public.tasks;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='events') then
      alter publication supabase_realtime add table public.events;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;
