# Loom MVP

Loom is a mobile-first family management web app built with Next.js + Supabase.

## Stack

- Frontend: Next.js (App Router), TypeScript, TailwindCSS
- Data/Auth: Supabase Postgres, Supabase Auth, Supabase Realtime, RLS
- Client state/forms: React Query, React Hook Form, Zod
- i18n: dictionary-based locale system with `en` default and runtime language switch

## Implemented MVP Scope

- Authentication: register, login, logout, forgot password
- Onboarding: create family if user has none
- Family management:
  - family settings
  - member listing
  - invite by email
- Lists:
  - create/edit/archive lists
  - add/complete/delete list items
  - realtime item updates
- Tasks:
  - create/edit/archive tasks
  - assign users
  - quick completion
  - filters (mine/status/priority)
  - realtime updates
- Calendar:
  - create/edit/archive events
  - agenda + month view
- Notifications:
  - in-app notification center
  - mark one/all as read
- Profile:
  - update name
  - update locale
  - avatar upload (Supabase Storage)
- Visibility model in DB:
  - `private`, `family`, `selected_members`

## Database

Migration file for the Loom family domain:

- `client/supabase/migrations/20260307203000_loom_family_mvp_reset.sql`

This migration:

- removes old PoC `spaces` domain objects
- creates Loom enums/tables:
  - `profiles`
  - `families`
  - `family_members`
  - `lists`
  - `list_items`
  - `tasks`
  - `events`
  - `entity_shares`
  - `notifications`
  - `user_settings`
- applies RLS and permission helper functions
- adds onboarding/member RPCs
- enables realtime publication for lists/tasks/events/notifications

## Supabase Manual Setup

1. Create a Supabase project.
2. In `SQL Editor`, run:
   - `client/supabase/migrations/20260307203000_loom_family_mvp_reset.sql`
3. In `Authentication > Providers`, ensure `Email` is enabled.
4. Optional for avatars:
   - create public storage bucket named `avatars`.
5. Confirm URL + anon key values for environment variables.

## Environment Variables

Create `client/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Reference template:

- `client/.env.example`

## Local Run

1. Install dependencies:
   - `npm install --prefix client`
2. Run app:
   - `npm run dev:client`
3. Open:
   - `http://localhost:3000`

## Build Validation

- `npm run build --prefix client`

## Notes

- RLS is the source of truth for data access.
- API routes and feature services validate input with Zod.
- Realtime currently targets list and task collaboration flows.
