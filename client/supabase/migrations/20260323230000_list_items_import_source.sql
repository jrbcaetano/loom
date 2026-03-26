alter table public.list_items
add column if not exists import_source_type text,
add column if not exists import_source_name text,
add column if not exists imported_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'list_items'
      and column_name = 'import_source_type'
  ) then
    alter table public.list_items
      drop constraint if exists list_items_import_source_type_check;

    alter table public.list_items
      add constraint list_items_import_source_type_check
      check (
        import_source_type is null
        or import_source_type in ('receipt_pdf')
      );
  end if;
end
$$;
