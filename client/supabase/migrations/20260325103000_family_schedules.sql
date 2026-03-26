create table if not exists public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  category text not null default 'custom' check (category in ('work', 'school', 'sport', 'custom')),
  location text,
  starts_at_local time not null,
  ends_at_local time not null,
  spans_next_day boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_templates_time_chk check (
    (spans_next_day = false and ends_at_local > starts_at_local)
    or (spans_next_day = true and ends_at_local <> starts_at_local)
  )
);

create index if not exists idx_schedule_templates_family_id
  on public.schedule_templates(family_id);

drop trigger if exists trg_schedule_templates_set_updated_at on public.schedule_templates;
create trigger trg_schedule_templates_set_updated_at
before update on public.schedule_templates
for each row execute function public.set_updated_at();

create table if not exists public.schedule_series (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  category text not null default 'custom' check (category in ('work', 'school', 'sport', 'custom')),
  location text,
  notes text,
  starts_on date not null,
  ends_on date,
  cycle_length_weeks integer not null default 1 check (cycle_length_weeks between 1 and 12),
  is_enabled boolean not null default true,
  archived boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_series_dates_chk check (ends_on is null or ends_on >= starts_on)
);

create index if not exists idx_schedule_series_family_id
  on public.schedule_series(family_id);

create index if not exists idx_schedule_series_member_id
  on public.schedule_series(family_member_id);

drop trigger if exists trg_schedule_series_set_updated_at on public.schedule_series;
create trigger trg_schedule_series_set_updated_at
before update on public.schedule_series
for each row execute function public.set_updated_at();

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedule_series(id) on delete cascade,
  template_id uuid references public.schedule_templates(id) on delete set null,
  week_index integer not null default 1 check (week_index between 1 and 12),
  weekday smallint not null check (weekday between 0 and 6),
  title text not null check (char_length(trim(title)) between 1 and 180),
  location text,
  starts_at_local time not null,
  ends_at_local time not null,
  spans_next_day boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_blocks_time_chk check (
    (spans_next_day = false and ends_at_local > starts_at_local)
    or (spans_next_day = true and ends_at_local <> starts_at_local)
  )
);

create index if not exists idx_schedule_blocks_schedule_id
  on public.schedule_blocks(schedule_id, week_index, weekday, sort_order);

drop trigger if exists trg_schedule_blocks_set_updated_at on public.schedule_blocks;
create trigger trg_schedule_blocks_set_updated_at
before update on public.schedule_blocks
for each row execute function public.set_updated_at();

create table if not exists public.schedule_pauses (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedule_series(id) on delete cascade,
  start_on date not null,
  end_on date not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_pauses_dates_chk check (end_on >= start_on)
);

create index if not exists idx_schedule_pauses_schedule_id
  on public.schedule_pauses(schedule_id, start_on, end_on);

drop trigger if exists trg_schedule_pauses_set_updated_at on public.schedule_pauses;
create trigger trg_schedule_pauses_set_updated_at
before update on public.schedule_pauses
for each row execute function public.set_updated_at();

create table if not exists public.schedule_override_days (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedule_series(id) on delete cascade,
  override_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, override_date)
);

create index if not exists idx_schedule_override_days_schedule_id
  on public.schedule_override_days(schedule_id, override_date);

drop trigger if exists trg_schedule_override_days_set_updated_at on public.schedule_override_days;
create trigger trg_schedule_override_days_set_updated_at
before update on public.schedule_override_days
for each row execute function public.set_updated_at();

create table if not exists public.schedule_override_blocks (
  id uuid primary key default gen_random_uuid(),
  override_day_id uuid not null references public.schedule_override_days(id) on delete cascade,
  template_id uuid references public.schedule_templates(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 180),
  location text,
  starts_at_local time not null,
  ends_at_local time not null,
  spans_next_day boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_override_blocks_time_chk check (
    (spans_next_day = false and ends_at_local > starts_at_local)
    or (spans_next_day = true and ends_at_local <> starts_at_local)
  )
);

create index if not exists idx_schedule_override_blocks_day_id
  on public.schedule_override_blocks(override_day_id, sort_order);

drop trigger if exists trg_schedule_override_blocks_set_updated_at on public.schedule_override_blocks;
create trigger trg_schedule_override_blocks_set_updated_at
before update on public.schedule_override_blocks
for each row execute function public.set_updated_at();

create or replace function public.schedule_series_family_id(target_schedule_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id
  from public.schedule_series
  where id = target_schedule_id;
$$;

create or replace function public.schedule_override_family_id(target_override_day_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ss.family_id
  from public.schedule_override_days sod
  join public.schedule_series ss on ss.id = sod.schedule_id
  where sod.id = target_override_day_id;
$$;

alter table public.schedule_templates enable row level security;
alter table public.schedule_series enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.schedule_pauses enable row level security;
alter table public.schedule_override_days enable row level security;
alter table public.schedule_override_blocks enable row level security;

drop policy if exists "schedule_templates_select" on public.schedule_templates;
drop policy if exists "schedule_templates_insert" on public.schedule_templates;
drop policy if exists "schedule_templates_update" on public.schedule_templates;
drop policy if exists "schedule_templates_delete" on public.schedule_templates;

create policy "schedule_templates_select"
on public.schedule_templates for select to authenticated
using (public.is_active_family_member(family_id));

create policy "schedule_templates_insert"
on public.schedule_templates for insert to authenticated
with check (public.is_active_family_member(family_id));

create policy "schedule_templates_update"
on public.schedule_templates for update to authenticated
using (public.is_active_family_member(family_id))
with check (public.is_active_family_member(family_id));

create policy "schedule_templates_delete"
on public.schedule_templates for delete to authenticated
using (public.is_active_family_member(family_id));

drop policy if exists "schedule_series_select" on public.schedule_series;
drop policy if exists "schedule_series_insert" on public.schedule_series;
drop policy if exists "schedule_series_update" on public.schedule_series;
drop policy if exists "schedule_series_delete" on public.schedule_series;

create policy "schedule_series_select"
on public.schedule_series for select to authenticated
using (public.is_active_family_member(family_id));

create policy "schedule_series_insert"
on public.schedule_series for insert to authenticated
with check (public.is_active_family_member(family_id));

create policy "schedule_series_update"
on public.schedule_series for update to authenticated
using (public.is_active_family_member(family_id))
with check (public.is_active_family_member(family_id));

create policy "schedule_series_delete"
on public.schedule_series for delete to authenticated
using (public.is_active_family_member(family_id));

drop policy if exists "schedule_blocks_select" on public.schedule_blocks;
drop policy if exists "schedule_blocks_insert" on public.schedule_blocks;
drop policy if exists "schedule_blocks_update" on public.schedule_blocks;
drop policy if exists "schedule_blocks_delete" on public.schedule_blocks;

create policy "schedule_blocks_select"
on public.schedule_blocks for select to authenticated
using (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

create policy "schedule_blocks_insert"
on public.schedule_blocks for insert to authenticated
with check (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

create policy "schedule_blocks_update"
on public.schedule_blocks for update to authenticated
using (public.is_active_family_member(public.schedule_series_family_id(schedule_id)))
with check (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

create policy "schedule_blocks_delete"
on public.schedule_blocks for delete to authenticated
using (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

drop policy if exists "schedule_pauses_select" on public.schedule_pauses;
drop policy if exists "schedule_pauses_insert" on public.schedule_pauses;
drop policy if exists "schedule_pauses_update" on public.schedule_pauses;
drop policy if exists "schedule_pauses_delete" on public.schedule_pauses;

create policy "schedule_pauses_select"
on public.schedule_pauses for select to authenticated
using (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

create policy "schedule_pauses_insert"
on public.schedule_pauses for insert to authenticated
with check (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

create policy "schedule_pauses_update"
on public.schedule_pauses for update to authenticated
using (public.is_active_family_member(public.schedule_series_family_id(schedule_id)))
with check (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

create policy "schedule_pauses_delete"
on public.schedule_pauses for delete to authenticated
using (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

drop policy if exists "schedule_override_days_select" on public.schedule_override_days;
drop policy if exists "schedule_override_days_insert" on public.schedule_override_days;
drop policy if exists "schedule_override_days_update" on public.schedule_override_days;
drop policy if exists "schedule_override_days_delete" on public.schedule_override_days;

create policy "schedule_override_days_select"
on public.schedule_override_days for select to authenticated
using (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

create policy "schedule_override_days_insert"
on public.schedule_override_days for insert to authenticated
with check (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

create policy "schedule_override_days_update"
on public.schedule_override_days for update to authenticated
using (public.is_active_family_member(public.schedule_series_family_id(schedule_id)))
with check (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

create policy "schedule_override_days_delete"
on public.schedule_override_days for delete to authenticated
using (public.is_active_family_member(public.schedule_series_family_id(schedule_id)));

drop policy if exists "schedule_override_blocks_select" on public.schedule_override_blocks;
drop policy if exists "schedule_override_blocks_insert" on public.schedule_override_blocks;
drop policy if exists "schedule_override_blocks_update" on public.schedule_override_blocks;
drop policy if exists "schedule_override_blocks_delete" on public.schedule_override_blocks;

create policy "schedule_override_blocks_select"
on public.schedule_override_blocks for select to authenticated
using (public.is_active_family_member(public.schedule_override_family_id(override_day_id)));

create policy "schedule_override_blocks_insert"
on public.schedule_override_blocks for insert to authenticated
with check (public.is_active_family_member(public.schedule_override_family_id(override_day_id)));

create policy "schedule_override_blocks_update"
on public.schedule_override_blocks for update to authenticated
using (public.is_active_family_member(public.schedule_override_family_id(override_day_id)))
with check (public.is_active_family_member(public.schedule_override_family_id(override_day_id)));

create policy "schedule_override_blocks_delete"
on public.schedule_override_blocks for delete to authenticated
using (public.is_active_family_member(public.schedule_override_family_id(override_day_id)));

grant select, insert, update, delete on public.schedule_templates to authenticated;
grant select, insert, update, delete on public.schedule_series to authenticated;
grant select, insert, update, delete on public.schedule_blocks to authenticated;
grant select, insert, update, delete on public.schedule_pauses to authenticated;
grant select, insert, update, delete on public.schedule_override_days to authenticated;
grant select, insert, update, delete on public.schedule_override_blocks to authenticated;
