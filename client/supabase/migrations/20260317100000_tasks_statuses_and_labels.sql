-- Tasks: Todoist-style statuses + personal/family labels
-- NOTE: enum values cannot be added and used in the same transaction, so we swap enum types.

do $$
begin
  if exists (select 1 from pg_type where typname = 'task_status')
     and not exists (select 1 from pg_type where typname = 'task_status_old') then
    alter type public.task_status rename to task_status_old;
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('inbox', 'next', 'in_progress', 'waiting', 'done');
  end if;
end $$;

alter table public.tasks
  alter column status drop default;

alter table public.tasks
  alter column status type public.task_status
  using (
    case status::text
      when 'todo' then 'inbox'
      when 'doing' then 'in_progress'
      when 'done' then 'done'
      when 'inbox' then 'inbox'
      when 'next' then 'next'
      when 'in_progress' then 'in_progress'
      when 'waiting' then 'waiting'
      else 'inbox'
    end::public.task_status
  );

alter table public.tasks
  alter column status set default 'inbox';

do $$
begin
  if exists (select 1 from pg_type where typname = 'task_status_old') then
    execute 'drop function if exists public.create_task_with_shares(uuid, text, text, public.task_status_old, public.task_priority, timestamptz, uuid, public.visibility_level, uuid[])';
    execute 'drop function if exists public.create_task_with_shares(uuid, text, text, public.task_status_old, public.task_priority, timestamptz, uuid, public.visibility_level, uuid[], timestamptz)';
  end if;
end $$;

drop type if exists public.task_status_old;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_label_scope') then
    create type public.task_label_scope as enum ('personal', 'family');
  end if;
end $$;

create table if not exists public.task_labels (
  id uuid primary key default gen_random_uuid(),
  scope public.task_label_scope not null,
  user_id uuid references public.profiles(id) on delete cascade,
  family_id uuid references public.families(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null check (color ~* '^#[0-9A-F]{6}$'),
  archived boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_labels_scope_owner_chk check (
    (scope = 'personal' and user_id is not null and family_id is null)
    or (scope = 'family' and family_id is not null and user_id is null)
  )
);

drop trigger if exists trg_task_labels_set_updated_at on public.task_labels;
create trigger trg_task_labels_set_updated_at before update on public.task_labels for each row execute function public.set_updated_at();

create unique index if not exists uq_task_labels_personal_name
  on public.task_labels (user_id, lower(name))
  where scope = 'personal' and archived = false;

create unique index if not exists uq_task_labels_family_name
  on public.task_labels (family_id, lower(name))
  where scope = 'family' and archived = false;

create index if not exists idx_task_labels_user_id on public.task_labels(user_id);
create index if not exists idx_task_labels_family_id on public.task_labels(family_id);

create table if not exists public.task_label_assignments (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.task_labels(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id)
);

create index if not exists idx_task_label_assignments_label on public.task_label_assignments(label_id);
create index if not exists idx_task_label_assignments_family on public.task_label_assignments(family_id);

create or replace function public.validate_task_label_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  task_family_id uuid;
  label_scope public.task_label_scope;
  label_family_id uuid;
begin
  select family_id
  into task_family_id
  from public.tasks
  where id = new.task_id;

  if task_family_id is null then
    raise exception 'Task not found for label assignment';
  end if;

  select scope, family_id
  into label_scope, label_family_id
  from public.task_labels
  where id = new.label_id;

  if label_scope is null then
    raise exception 'Label not found for task assignment';
  end if;

  if new.family_id <> task_family_id then
    raise exception 'Task label assignment family does not match task family';
  end if;

  if label_scope = 'family' and label_family_id <> task_family_id then
    raise exception 'Family label must belong to the same family as the task';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_task_label_assignments_validate on public.task_label_assignments;
create trigger trg_task_label_assignments_validate
before insert or update on public.task_label_assignments
for each row execute function public.validate_task_label_assignment();

create or replace function public.create_task_with_shares(
  target_family_id uuid,
  task_title text,
  task_description text default null,
  task_status_value public.task_status default 'inbox',
  task_priority_value public.task_priority default 'medium',
  task_due_at timestamptz default null,
  task_assigned_to_user_id uuid default null,
  task_visibility public.visibility_level default 'family',
  selected_member_ids uuid[] default array[]::uuid[],
  task_start_at timestamptz default null
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

  if task_start_at is not null and task_due_at is not null and task_due_at < task_start_at then
    raise exception 'Due date must be on or after start date';
  end if;

  insert into public.tasks (
    family_id,
    owner_user_id,
    assigned_to_user_id,
    title,
    description,
    status,
    priority,
    start_at,
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
    task_start_at,
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

alter table public.task_labels enable row level security;
alter table public.task_label_assignments enable row level security;

drop policy if exists "task_labels_select" on public.task_labels;
drop policy if exists "task_labels_insert" on public.task_labels;
drop policy if exists "task_labels_update" on public.task_labels;
drop policy if exists "task_labels_delete" on public.task_labels;

create policy "task_labels_select" on public.task_labels for select to authenticated
using (
  (scope = 'personal' and user_id = auth.uid())
  or (scope = 'family' and public.is_active_family_member(family_id))
);

create policy "task_labels_insert" on public.task_labels for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    (scope = 'personal' and user_id = auth.uid())
    or (scope = 'family' and public.can_manage_family(family_id))
  )
);

create policy "task_labels_update" on public.task_labels for update to authenticated
using (
  (scope = 'personal' and user_id = auth.uid())
  or (scope = 'family' and public.can_manage_family(family_id))
)
with check (
  updated_by = auth.uid()
  and (
    (scope = 'personal' and user_id = auth.uid())
    or (scope = 'family' and public.can_manage_family(family_id))
  )
);

create policy "task_labels_delete" on public.task_labels for delete to authenticated
using (
  (scope = 'personal' and user_id = auth.uid())
  or (scope = 'family' and public.can_manage_family(family_id))
);

drop policy if exists "task_label_assignments_select" on public.task_label_assignments;
drop policy if exists "task_label_assignments_insert" on public.task_label_assignments;
drop policy if exists "task_label_assignments_update" on public.task_label_assignments;
drop policy if exists "task_label_assignments_delete" on public.task_label_assignments;

create policy "task_label_assignments_select" on public.task_label_assignments for select to authenticated
using (public.can_view_entity('task', task_id));

create policy "task_label_assignments_insert" on public.task_label_assignments for insert to authenticated
with check (created_by = auth.uid() and public.can_edit_entity('task', task_id));

create policy "task_label_assignments_update" on public.task_label_assignments for update to authenticated
using (public.can_edit_entity('task', task_id))
with check (public.can_edit_entity('task', task_id));

create policy "task_label_assignments_delete" on public.task_label_assignments for delete to authenticated
using (public.can_edit_entity('task', task_id));

grant select, insert, update, delete on public.task_labels to authenticated;
grant select, insert, update, delete on public.task_label_assignments to authenticated;

grant execute on function public.validate_task_label_assignment() to authenticated;
grant execute on function public.create_task_with_shares(uuid, text, text, public.task_status, public.task_priority, timestamptz, uuid, public.visibility_level, uuid[], timestamptz) to authenticated;
