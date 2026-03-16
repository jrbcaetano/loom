alter table public.families
add column if not exists allow_multiple_lists boolean not null default true;

