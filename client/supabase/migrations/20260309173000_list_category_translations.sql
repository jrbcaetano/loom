create table if not exists public.list_category_translations (
  id uuid primary key default gen_random_uuid(),
  list_category_id uuid not null references public.list_categories(id) on delete cascade,
  locale text not null,
  label text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint list_category_translations_label_chk check (char_length(btrim(label)) > 0),
  constraint list_category_translations_locale_chk check (locale in ('en', 'pt')),
  constraint list_category_translations_unique unique (list_category_id, locale)
);

create index if not exists idx_list_category_translations_category_id on public.list_category_translations(list_category_id);
create index if not exists idx_list_category_translations_locale on public.list_category_translations(locale);

drop trigger if exists trg_list_category_translations_set_updated_at on public.list_category_translations;
create trigger trg_list_category_translations_set_updated_at
before update on public.list_category_translations
for each row execute function public.set_updated_at();

insert into public.list_category_translations (list_category_id, locale, label, created_by)
select
  lc.id,
  'pt',
  case lower(btrim(lc.name))
    when 'produce' then 'Frutas e vegetais'
    when 'dairy' then 'Laticinios'
    when 'meat' then 'Carne'
    when 'bakery' then 'Padaria'
    when 'household' then 'Casa'
    when 'pantry' then 'Despensa'
    else null
  end,
  lc.created_by
from public.list_categories lc
where case lower(btrim(lc.name))
  when 'produce' then true
  when 'dairy' then true
  when 'meat' then true
  when 'bakery' then true
  when 'household' then true
  when 'pantry' then true
  else false
end
on conflict (list_category_id, locale) do nothing;

alter table public.list_category_translations enable row level security;

drop policy if exists "list_category_translations_select" on public.list_category_translations;
drop policy if exists "list_category_translations_insert" on public.list_category_translations;
drop policy if exists "list_category_translations_update" on public.list_category_translations;
drop policy if exists "list_category_translations_delete" on public.list_category_translations;

create policy "list_category_translations_select" on public.list_category_translations for select to authenticated
using (
  exists (
    select 1
    from public.list_categories lc
    where lc.id = list_category_id
      and public.can_view_entity('list', lc.list_id)
  )
);

create policy "list_category_translations_insert" on public.list_category_translations for insert to authenticated
with check (
  (created_by is null or created_by = auth.uid())
  and exists (
    select 1
    from public.list_categories lc
    where lc.id = list_category_id
      and public.can_edit_entity('list', lc.list_id)
  )
);

create policy "list_category_translations_update" on public.list_category_translations for update to authenticated
using (
  exists (
    select 1
    from public.list_categories lc
    where lc.id = list_category_id
      and public.can_edit_entity('list', lc.list_id)
  )
)
with check (
  (created_by is null or created_by = auth.uid())
  and exists (
    select 1
    from public.list_categories lc
    where lc.id = list_category_id
      and public.can_edit_entity('list', lc.list_id)
  )
);

create policy "list_category_translations_delete" on public.list_category_translations for delete to authenticated
using (
  exists (
    select 1
    from public.list_categories lc
    where lc.id = list_category_id
      and public.can_edit_entity('list', lc.list_id)
  )
);

grant select, insert, update, delete on public.list_category_translations to authenticated;

alter table public.list_category_translations replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'list_category_translations'
    ) then
      alter publication supabase_realtime add table public.list_category_translations;
    end if;
  end if;
end $$;
