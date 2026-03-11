-- Product feature flags controlled by product admins.

create table if not exists public.product_feature_flags (
  feature_key text primary key check (
    feature_key in (
      'tasks',
      'lists',
      'calendar',
      'notifications',
      'meals',
      'chores',
      'rewards',
      'notes',
      'messages',
      'expenses',
      'documents',
      'routines',
      'family_members',
      'family_settings',
      'settings'
    )
  ),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

drop trigger if exists trg_product_feature_flags_set_updated_at on public.product_feature_flags;
create trigger trg_product_feature_flags_set_updated_at
before update on public.product_feature_flags
for each row execute function public.set_updated_at();

alter table public.product_feature_flags enable row level security;

drop policy if exists "product_feature_flags_select" on public.product_feature_flags;
drop policy if exists "product_feature_flags_insert" on public.product_feature_flags;
drop policy if exists "product_feature_flags_update" on public.product_feature_flags;
drop policy if exists "product_feature_flags_delete" on public.product_feature_flags;

create policy "product_feature_flags_select"
on public.product_feature_flags
for select
to authenticated
using (true);

create policy "product_feature_flags_insert"
on public.product_feature_flags
for insert
to authenticated
with check (public.is_product_admin());

create policy "product_feature_flags_update"
on public.product_feature_flags
for update
to authenticated
using (public.is_product_admin())
with check (public.is_product_admin());

create policy "product_feature_flags_delete"
on public.product_feature_flags
for delete
to authenticated
using (public.is_product_admin());

grant select, insert, update, delete on public.product_feature_flags to authenticated;

insert into public.product_feature_flags (feature_key, is_enabled)
values
  ('tasks', true),
  ('lists', true),
  ('calendar', true),
  ('notifications', true),
  ('meals', true),
  ('chores', true),
  ('rewards', true),
  ('notes', true),
  ('messages', true),
  ('expenses', true),
  ('documents', true),
  ('routines', true),
  ('family_members', true),
  ('family_settings', true),
  ('settings', true)
on conflict (feature_key) do nothing;
