alter table public.schedule_series
  add column if not exists color text not null default '#7c88d9';

alter table public.schedule_series
  drop constraint if exists schedule_series_color_chk;

alter table public.schedule_series
  add constraint schedule_series_color_chk
  check (color ~ '^#[0-9A-Fa-f]{6}$');
