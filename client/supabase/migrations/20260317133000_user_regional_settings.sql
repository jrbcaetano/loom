-- Regional preferences per user

alter table public.user_settings
  add column if not exists date_format text not null default 'locale';

alter table public.user_settings
  add column if not exists time_format text not null default 'locale';

alter table public.user_settings
  drop constraint if exists user_settings_date_format_chk;

alter table public.user_settings
  add constraint user_settings_date_format_chk
  check (date_format in ('locale', 'dd_mm_yyyy', 'mm_dd_yyyy', 'yyyy_mm_dd'));

alter table public.user_settings
  drop constraint if exists user_settings_time_format_chk;

alter table public.user_settings
  add constraint user_settings_time_format_chk
  check (time_format in ('locale', '12h', '24h'));
