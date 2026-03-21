-- Harden user theme preferences for the theme system rollout

update public.user_settings
set theme = 'loom'
where theme is null
   or theme not in ('loom', 'loom-dark', 'compact', 'hearth');

alter table public.user_settings
  alter column theme set default 'loom';

alter table public.user_settings
  drop constraint if exists user_settings_theme_chk;

alter table public.user_settings
  add constraint user_settings_theme_chk
  check (theme is null or theme in ('loom', 'loom-dark', 'compact', 'hearth'));
