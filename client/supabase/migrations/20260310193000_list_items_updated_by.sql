alter table public.list_items
add column if not exists updated_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'list_items'
      and column_name = 'updated_by'
  ) then
    execute 'update public.list_items set updated_by = coalesce(updated_by, created_by) where updated_by is null';
  end if;
end
$$;
