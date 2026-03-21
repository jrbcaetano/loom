-- Split density from theme so compact can be combined with any theme

alter table public.user_settings
  add column if not exists density text;

update public.user_settings
set density = case
  when theme = 'compact' then 'compact'
  else coalesce(density, 'comfortable')
end;

update public.user_settings
set theme = 'loom'
where theme = 'compact';

alter table public.user_settings
  alter column density set default 'comfortable';

alter table public.user_settings
  drop constraint if exists user_settings_density_chk;

alter table public.user_settings
  add constraint user_settings_density_chk
  check (density is null or density in ('comfortable', 'compact'));

alter table public.user_settings
  drop constraint if exists user_settings_theme_chk;

alter table public.user_settings
  add constraint user_settings_theme_chk
  check (theme is null or theme in ('loom', 'loom-dark', 'hearth'));
