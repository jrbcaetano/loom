-- PWA push notification infrastructure.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_id uuid references public.families(id) on delete set null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time timestamptz null,
  user_agent text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_family_id on public.push_subscriptions(family_id);

drop trigger if exists trg_push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;

create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid());

create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
on public.push_subscriptions
for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.push_event_flags (
  event_key text primary key check (
    event_key in (
      'new_message',
      'task_assigned',
      'list_shared',
      'event_created',
      'general_notification'
    )
  ),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

drop trigger if exists trg_push_event_flags_set_updated_at on public.push_event_flags;
create trigger trg_push_event_flags_set_updated_at
before update on public.push_event_flags
for each row execute function public.set_updated_at();

alter table public.push_event_flags enable row level security;

drop policy if exists "push_event_flags_select" on public.push_event_flags;
drop policy if exists "push_event_flags_insert" on public.push_event_flags;
drop policy if exists "push_event_flags_update" on public.push_event_flags;
drop policy if exists "push_event_flags_delete" on public.push_event_flags;

create policy "push_event_flags_select"
on public.push_event_flags
for select
to authenticated
using (public.is_product_admin() or true);

create policy "push_event_flags_insert"
on public.push_event_flags
for insert
to authenticated
with check (public.is_product_admin());

create policy "push_event_flags_update"
on public.push_event_flags
for update
to authenticated
using (public.is_product_admin())
with check (public.is_product_admin());

create policy "push_event_flags_delete"
on public.push_event_flags
for delete
to authenticated
using (public.is_product_admin());

grant select, insert, update, delete on public.push_event_flags to authenticated;

insert into public.push_event_flags (event_key, is_enabled)
values
  ('new_message', true),
  ('task_assigned', true),
  ('list_shared', true),
  ('event_created', true),
  ('general_notification', true)
on conflict (event_key) do nothing;

create or replace function public.get_push_subscriptions_for_conversation(target_conversation_id uuid)
returns table (
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_id uuid;
begin
  requester_id := auth.uid();
  if requester_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = requester_id
  ) then
    raise exception 'Forbidden';
  end if;

  return query
  select ps.user_id, ps.endpoint, ps.p256dh, ps.auth
  from public.push_subscriptions ps
  where ps.user_id in (
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id <> requester_id
  );
end;
$$;

grant execute on function public.get_push_subscriptions_for_conversation(uuid) to authenticated;
