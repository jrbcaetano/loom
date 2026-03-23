alter table public.list_items
add column if not exists price numeric(10,2) check (price is null or price >= 0);
