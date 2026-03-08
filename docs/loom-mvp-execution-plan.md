# Loom MVP Execution Plan (Mobile-First)

## 1) Architecture Summary
- Frontend: Next.js App Router + TypeScript + TailwindCSS.
- Data/auth/realtime: Supabase (Auth, Postgres, Realtime, RLS).
- Validation/form: Zod + React Hook Form.
- Server-state: React Query (query + mutation + cache invalidation).
- i18n: `next-intl` with `en` default and locale dictionaries.

## 2) Target Folder Structure
```text
client/
  app/
    [locale]/
      (auth)/
      (onboarding)/
      (app)/
        home/
        lists/
        tasks/
        calendar/
        notifications/
        family/
        profile/
  components/
    layout/
    common/
    lists/
    tasks/
    events/
    family/
    notifications/
  features/
    auth/
    onboarding/
    families/
    lists/
    tasks/
    events/
    notifications/
    profile/
  lib/
    supabase/
    query/
    i18n/
    validation/
  messages/
    en.json
    pt.json
  supabase/
    migrations/
```

## 3) Domain Model
- `profiles`: app user profile linked to `auth.users`.
- `families`: family workspace.
- `family_members`: membership, role (`admin/adult/child`), status (`active/invited/inactive`).
- `lists` + `list_items`: shopping and shared lists.
- `tasks`: assignable family tasks.
- `events`: family calendar events.
- `entity_shares`: selective sharing for lists/tasks/events.
- `notifications`: in-app notification center.
- `user_settings`: active family and future per-user settings.

## 4) Permissions Model
- Baseline: user must be authenticated + active family member.
- Visibility model (`private/family/selected_members`):
  - `private`: owner only.
  - `family`: all active family members.
  - `selected_members`: owner + specifically shared members (`entity_shares`).
- Edit model:
  - owner can edit.
  - family-visible content editable by `admin/adult`.
  - selected-shared editable only with `edit` share permission.
- All enforcement is in Postgres RLS + helper SQL functions.

## 5) State Management
- React Query: remote data loading, mutation lifecycle, optimistic updates where safe.
- React Hook Form + Zod: forms and input validation.
- Local component state for transient UI only.
- Avoid global store unless a real cross-feature client state appears.

## 6) Execution Stages

### Stage A - Foundation Refactor (Design + Setup)
- Remove previous space-domain UI routes/components.
- Keep and reuse Supabase auth/session infrastructure.
- Install: `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `next-intl`.
- Build app shell with mobile bottom tabs + desktop sidebar.
- Add locale routing and language switcher (`en` default).
- Deliverables: clean baseline app shell + i18n plumbing.
- Estimate: 4-6 hours, ~45k-70k tokens.

### Stage B - Database + Access Layer
- Apply migration creating family-domain schema and RLS.
- Add typed repositories/services for families, lists, tasks, events, notifications.
- Add server actions/api handlers per feature with Zod validation.
- Add realtime subscriptions for lists/tasks updates.
- Deliverables: secure data layer and first end-to-end CRUD path.
- Estimate: 6-9 hours, ~70k-110k tokens.

### Stage C - Auth + Onboarding + Family Management
- Auth screens (login/register/forgot).
- Session guard and post-login routing.
- Onboarding decision: create family or continue.
- Family pages: settings + members + invite.
- Deliverables: user can sign in, create family, invite/join members.
- Estimate: 4-6 hours, ~50k-75k tokens.

### Stage D - Lists Feature
- Lists index + detail + create/edit/delete.
- Item management (add/edit/complete/delete, sorting basics).
- Visibility chips and selected-member sharing UI.
- Realtime list/list-item updates.
- Deliverables: production-ready shopping list flow.
- Estimate: 5-7 hours, ~60k-90k tokens.

### Stage E - Tasks Feature
- Task CRUD + assign + status + priority + due date.
- Filter chips (`mine/family/open/done/high priority`).
- Notifications on assignment.
- Deliverables: complete task workflow with secure assignment.
- Estimate: 5-7 hours, ~60k-90k tokens.

### Stage F - Calendar + Notifications + Profile
- Event CRUD with agenda + month-lite view.
- Notification center (read/unread, mark read).
- Profile page (name/avatar/locale).
- Deliverables: complete MVP feature set.
- Estimate: 5-7 hours, ~60k-90k tokens.

### Stage G - Hardening + QA
- End-to-end scenario testing with realistic dummy data.
- RLS verification matrix (owner/member/non-member).
- Build/lint/type checks and UX polish for mobile.
- Deliverables: release candidate quality MVP.
- Estimate: 3-5 hours, ~35k-55k tokens.

## 7) Validation Checklist (Per Stage)
- TypeScript build passes.
- Supabase queries/mutations validated against schema.
- RLS behavior validated for positive and negative cases.
- Responsive checks on mobile and desktop.
- No hydration/runtime errors in auth/session flows.


