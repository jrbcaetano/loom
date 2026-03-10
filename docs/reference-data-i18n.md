# Reference Data Translation (Lists)

Loom now supports translatable list-level reference values (categories).

## Database model

- `public.list_categories`
  - Base reference value (`name`) scoped to a list.
- `public.list_category_translations`
  - `list_category_id` -> FK to `list_categories.id`
  - `locale` -> language code (for example `en`, `pt`, `pt-PT`)
  - `label` -> translated label
  - Unique key: `(list_category_id, locale)`

When no translation exists for the selected locale, the application falls back to the base value (`list_categories.name`).

## Migrations

Run these migrations in order:

1. `20260309162000_list_categories.sql`
2. `20260309173000_list_category_translations.sql`
3. `20260309191500_list_category_translations_locale_flex.sql`

## UI configuration

List categories are configured in list create/edit form.

Category input format:

- One category per line
- Optional per-locale translations with `locale=value`
- Example:

```text
Produce | pt=Frutas e vegetais
Dairy | pt=Laticinios
```

You can provide multiple locales per line:

```text
Pantry | pt=Despensa | es=Despensa
```

If a locale translation is missing, UI shows the base category value.
