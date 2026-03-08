-- Task scheduling foundation for calendar integration

alter table public.tasks
  add column if not exists start_at timestamptz;

create index if not exists idx_tasks_start_at on public.tasks(start_at);

alter table public.tasks
  drop constraint if exists tasks_schedule_range_chk;

alter table public.tasks
  add constraint tasks_schedule_range_chk
  check (due_at is null or start_at is null or due_at >= start_at);

create or replace function public.create_task_with_shares(
  target_family_id uuid,
  task_title text,
  task_description text default null,
  task_status_value public.task_status default 'todo',
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

grant execute on function public.create_task_with_shares(uuid, text, text, public.task_status, public.task_priority, timestamptz, uuid, public.visibility_level, uuid[], timestamptz) to authenticated;
