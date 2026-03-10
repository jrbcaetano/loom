alter table public.list_category_translations
drop constraint if exists list_category_translations_locale_chk;

alter table public.list_category_translations
add constraint list_category_translations_locale_chk
check (locale ~ '^[a-z]{2}(-[A-Za-z]{2})?$');
