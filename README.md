# Loom MVP Foundation

Loom is evolving from a client/server communication PoC into a space-first MVP.

## Current architecture

- `client/`: Next.js (App Router) + TypeScript + Tailwind + Supabase auth/data access
- `server/`: Existing Express PoC kept in place (not removed), ready for future API needs
- `client/supabase/migrations/`: SQL migrations for space + membership foundation
- `client/styles/`: centralized design tokens and UI styling layers

## Implemented in this step

- Google OAuth sign-in wiring through Supabase
- Session handling with `@supabase/ssr` (browser, server, middleware)
- Protected dashboard shell (`/dashboard`)
- Space creation flow (RPC): creates space + admin membership atomically
- Admin member management by email invite:
  - Space admin page
  - Pending invite tracking
  - Automatic invite claim on next login/dashboard load
- Navigation + layout foundation inspired by task-first products (sidebar + workspace shell)
- Refined UX structure: responsive drawer sidebar, workspace top bar, split-panel list flows
- RLS-backed schema for:
  - `spaces`
  - `space_memberships`
  - role enum: `admin`, `member`

## MVP implementation plan (small steps)

1. Foundation (this delivery): auth + spaces + memberships + protected dashboard shell.
2. Add shopping lists data model and RLS (space-shared only in MVP).
3. Implement shopping list UI/flows (create list, add/remove items, mark complete).
4. Harden UX and production details (loading/error states, logging, tests, deploy config).
5. Extend architecture for future visibility levels (private, space, selected members).

## Environment variables

Create `client/.env.local` from `client/.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Supabase project setup requirements:

- Enable Google provider in Supabase Auth.
- Add callback URL(s), for local:
  - `http://localhost:3000/auth/callback`

## Local setup

1. Install dependencies:
   - `npm install --prefix client`
   - `npm install --prefix server`
2. Apply database migration:
   - run `client/supabase/migrations/20260306170000_mvp_foundation.sql` in Supabase SQL Editor
   - run `client/supabase/migrations/20260306183000_fix_space_memberships_rls_recursion.sql` in Supabase SQL Editor
   - run `client/supabase/migrations/20260306191500_space_invites_admin_flow.sql` in Supabase SQL Editor
3. Run frontend:
   - `npm run dev:client`
4. Optional (existing PoC server):
   - `npm run dev:server`

Frontend runs on `http://localhost:3000` by default with Next.js.

## Styling structure

To keep design changes easy and centralized:

- `client/styles/tokens.css`: colors, radii, shadows and theme-level variables
- `client/styles/base.css`: global base element styles
- `client/styles/layout.css`: shell/grid/navigation layout
- `client/styles/components.css`: reusable component classes (buttons, inputs, cards, lists)
