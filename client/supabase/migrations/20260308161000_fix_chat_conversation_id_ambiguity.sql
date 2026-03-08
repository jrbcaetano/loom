-- Fix ambiguous conversation_id references in chat functions/policies

create or replace function public.ensure_family_conversation(target_family_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_active_family_member(target_family_id, current_user_id) then
    raise exception 'Not a family member';
  end if;

  select c.id into v_conversation_id
  from public.conversations c
  where c.family_id = target_family_id
    and c.type = 'family'
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (family_id, type)
    values (target_family_id, 'family')
    returning id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    select v_conversation_id, fm.user_id
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.status = 'active'
      and fm.user_id is not null
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.create_direct_conversation(target_family_id uuid, other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if other_user_id is null then
    raise exception 'Target user required';
  end if;

  if other_user_id = current_user_id then
    raise exception 'Cannot create direct conversation with yourself';
  end if;

  if not public.is_active_family_member(target_family_id, current_user_id)
     or not public.is_active_family_member(target_family_id, other_user_id) then
    raise exception 'Both users must be active family members';
  end if;

  select c.id into v_conversation_id
  from public.conversations c
  where c.family_id = target_family_id
    and c.type = 'direct'
    and exists (select 1 from public.conversation_members cm where cm.conversation_id = c.id and cm.user_id = current_user_id)
    and exists (select 1 from public.conversation_members cm where cm.conversation_id = c.id and cm.user_id = other_user_id)
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (family_id, type)
    values (target_family_id, 'direct')
    returning id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, current_user_id), (v_conversation_id, other_user_id)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return v_conversation_id;
end;
$$;

drop policy if exists "conversation_members_select" on public.conversation_members;
drop policy if exists "conversation_members_insert" on public.conversation_members;
create policy "conversation_members_select" on public.conversation_members for select to authenticated
using (public.is_conversation_member(public.conversation_members.conversation_id));
create policy "conversation_members_insert" on public.conversation_members for insert to authenticated
with check (public.is_active_family_member((select c.family_id from public.conversations c where c.id = public.conversation_members.conversation_id)));

drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;
drop policy if exists "messages_update" on public.messages;
create policy "messages_select" on public.messages for select to authenticated
using (public.is_conversation_member(public.messages.conversation_id));
create policy "messages_insert" on public.messages for insert to authenticated
with check (sender_user_id = auth.uid() and public.is_conversation_member(public.messages.conversation_id));
create policy "messages_update" on public.messages for update to authenticated
using (public.is_conversation_member(public.messages.conversation_id))
with check (public.is_conversation_member(public.messages.conversation_id));
