create or replace function public.create_event_with_shares(
  target_family_id uuid,
  event_title text,
  event_start_at timestamptz,
  event_end_at timestamptz,
  event_description text default null,
  event_location text default null,
  event_all_day boolean default false,
  event_visibility public.visibility_level default 'family',
  selected_member_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_event_id uuid;
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

  if event_title is null or char_length(trim(event_title)) = 0 then
    raise exception 'Event title is required';
  end if;

  if event_start_at is null or event_end_at is null then
    raise exception 'Event start and end are required';
  end if;

  if event_end_at < event_start_at then
    raise exception 'Event end must be after start';
  end if;

  insert into public.events (
    family_id,
    owner_user_id,
    title,
    description,
    start_at,
    end_at,
    location,
    all_day,
    visibility,
    created_by,
    updated_by
  )
  values (
    target_family_id,
    current_user_id,
    trim(event_title),
    event_description,
    event_start_at,
    event_end_at,
    event_location,
    coalesce(event_all_day, false),
    event_visibility,
    current_user_id,
    current_user_id
  )
  returning id into new_event_id;

  if event_visibility = 'selected_members' then
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
      'event',
      new_event_id,
      member_id,
      'edit',
      current_user_id
    from unnest(coalesce(selected_member_ids, array[]::uuid[])) as member_id
    on conflict (entity_type, entity_id, shared_with_user_id) do nothing;
  end if;

  return new_event_id;
end;
$$;

grant execute on function public.create_event_with_shares(
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  boolean,
  public.visibility_level,
  uuid[]
) to authenticated;
