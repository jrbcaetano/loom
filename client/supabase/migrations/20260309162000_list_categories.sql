create table if not exists public.list_categories (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint list_categories_name_chk check (char_length(btrim(name)) > 0)
);

create index if not exists idx_list_categories_list_id on public.list_categories(list_id);
create unique index if not exists idx_list_categories_unique_name on public.list_categories(list_id, lower(btrim(name)));

drop trigger if exists trg_list_categories_set_updated_at on public.list_categories;
create trigger trg_list_categories_set_updated_at
before update on public.list_categories
for each row execute function public.set_updated_at();

insert into public.list_categories (list_id, name, created_by)
select distinct on (li.list_id, lower(btrim(li.category)))
  li.list_id,
  btrim(li.category) as name,
  coalesce(li.created_by, l.owner_user_id) as created_by
from public.list_items li
join public.lists l on l.id = li.list_id
where li.category is not null
  and char_length(btrim(li.category)) > 0
order by li.list_id, lower(btrim(li.category)), li.created_at asc
on conflict do nothing;

insert into public.list_categories (list_id, name, created_by)
select
  l.id,
  defaults.name,
  l.owner_user_id
from public.lists l
cross join (
  values
    ('Produce'),
    ('Dairy'),
    ('Meat'),
    ('Bakery'),
    ('Household'),
    ('Pantry')
) as defaults(name)
where lower(btrim(l.title)) = 'shopping list'
on conflict do nothing;

alter table public.list_categories enable row level security;

drop policy if exists "list_categories_select" on public.list_categories;
drop policy if exists "list_categories_insert" on public.list_categories;
drop policy if exists "list_categories_update" on public.list_categories;
drop policy if exists "list_categories_delete" on public.list_categories;

create policy "list_categories_select" on public.list_categories for select to authenticated
using (public.can_view_entity('list', list_id));

create policy "list_categories_insert" on public.list_categories for insert to authenticated
with check (public.can_edit_entity('list', list_id) and (created_by is null or created_by = auth.uid()));

create policy "list_categories_update" on public.list_categories for update to authenticated
using (public.can_edit_entity('list', list_id))
with check (public.can_edit_entity('list', list_id) and (created_by is null or created_by = auth.uid()));

create policy "list_categories_delete" on public.list_categories for delete to authenticated
using (public.can_edit_entity('list', list_id));

grant select, insert, update, delete on public.list_categories to authenticated;

alter table public.list_categories replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'list_categories'
    ) then
      alter publication supabase_realtime add table public.list_categories;
    end if;
  end if;
end $$;
