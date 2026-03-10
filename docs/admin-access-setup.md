# Product Admin And Invite-Only Setup

This checklist applies after deploying code that includes migration `20260310113000_product_admin_invite_only_access.sql`.

## 1. Run migrations in Supabase

Run all pending SQL migrations in your target Supabase project, including:

- `client/supabase/migrations/20260310113000_product_admin_invite_only_access.sql`

## 2. Bootstrap first product admin (manual SQL)

Run in Supabase SQL Editor with the email that should access `/admin`:

```sql
insert into public.product_admins (user_id, is_active)
select id, true
from auth.users
where lower(email) = lower('your-admin-email@example.com')
on conflict (user_id) do update set is_active = excluded.is_active, updated_at = now();
```

If this returns no rows, create the user account first.

## 3. Create first access invite (manual SQL or Admin UI)

Manual SQL option:

```sql
insert into public.app_access_invites (email, status)
values (lower('invited-user@example.com'), 'pending')
on conflict ((lower(email))) do update
set status = 'pending', accepted_by = null, accepted_at = null, updated_at = now();
```

After first product admin is set, prefer using `/admin` to manage invites.

## 4. Verify invite-only registration

1. Try registering with a non-invited email. It should fail.
2. Register with an invited email. It should succeed.
3. Confirm invite status changed to `accepted`:

```sql
select email, status, accepted_at
from public.app_access_invites
order by updated_at desc;
```

## 5. Operational notes

- Product admin checks are enforced in:
  - server page guard (`/admin`)
  - admin API routes
  - Supabase RLS policies
- Signup restriction is enforced by a DB trigger on `auth.users`.
