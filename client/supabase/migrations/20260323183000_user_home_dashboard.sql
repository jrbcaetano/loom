-- Per-user home dashboard preferences and widget settings

alter table public.user_settings
  add column if not exists home_dashboard jsonb not null default '{}'::jsonb;
