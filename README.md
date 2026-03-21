# Loom

Loom is a mobile-first family coordination web app built with Next.js and Supabase.

The project has grown beyond the original MVP baseline and now covers shared family workflows across planning, communication, household operations, and product-level administration.

## Current Product Scope

### Account and access

- Email/password authentication
- Google sign-in and sign-up
- Forgot password flow
- Invite-only access mode with activation workflow
- Product admin area for access management

### Family workspace

- Family onboarding
- Family member management
- Family settings
- Multiple family support with active family switching

### Core feature areas

- Home dashboard
- Tasks
- Lists
- Calendar
- Notifications
- Messages
- Meals
- Chores
- Rewards
- Notes
- Expenses
- Documents
- Routines

### Tasking and productivity

- Task creation and editing
- Task comments and audit trail
- Status workflows
- Personal and family task labels
- Task drawer interactions and quick-add flows
- Calendar-style task visualization

### Shared records and planning

- Shared lists with inline item editing
- Event scheduling and recurrence support
- External calendar support
- Notes, documents, expenses, and routines
- Meal planning and recipe management

### Preferences and UX

- Profile editing
- Avatar upload
- Language selection
- Regional date and time preferences
- Theme selection
- Density selection

## Theme System

The app now includes a theme and density system designed to scale with future feature work.

### Themes

- `Loom`
- `Loom Dark`
- `Hearth`

### Density modes

- `Comfortable`
- `Compact`

Theme and density are independent preferences, so combinations like dark plus compact are supported.

The styling system is token-driven and shared across desktop and mobile layouts so new feature work can inherit the active presentation mode without per-theme UI logic.

## Tech Stack

- Frontend: Next.js App Router, TypeScript
- Styling: shared CSS layers with app-level design tokens and theme tokens
- Data/Auth/Storage: Supabase Postgres, Supabase Auth, Supabase Storage, RLS
- Realtime: Supabase Realtime
- Client state/forms: React Query, React Hook Form, Zod
- Internationalization: dictionary-based locale system with English and Portuguese

## Project Structure

- `client/`: Next.js application
- `server/`: server-side companion workspace
- `client/app/`: routes, layouts, and API endpoints
- `client/features/`: feature modules
- `client/styles/`: shared tokens, design-system, layout, components, and themes
- `client/supabase/migrations/`: database migrations
- `docs/`: project and operational documentation

## Current Architecture Notes

- App access is enforced server-side and in the database layer.
- RLS is the source of truth for data access.
- Feature services and API routes validate input with Zod.
- Shared visual styling is centralized in token-based CSS layers.
- Theme and density are applied at the root layout before paint.
- The app is designed for both mobile and desktop, with shared theme behavior across both.

## Database and Migrations

The base family-domain reset is:

- `client/supabase/migrations/20260307203000_loom_family_mvp_reset.sql`

Important later migrations now cover:

- feature domains and module enablement
- regional user settings
- task comments and audit entries
- push notifications
- theme preferences
- density preferences

Recent preference-related migrations:

- `client/supabase/migrations/20260320173000_user_theme_system.sql`
- `client/supabase/migrations/20260321100000_user_density_preference.sql`

## Supabase Setup

1. Create a Supabase project.
2. Run the SQL migrations from `client/supabase/migrations/` in order.
3. Enable the authentication providers you intend to use.
4. Create the `avatars` public storage bucket if profile uploads are required.
5. Configure the client environment variables.

## Environment Variables

Create `client/.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Reference:

- `client/.env.example`

## Local Development

1. Install client dependencies:
   - `npm install --prefix client`
2. Start the client:
   - `npm run dev:client`
3. Open:
   - `http://localhost:3000`

## Build Validation

- `npm run build --prefix client`

## Operational Notes

- Product admin and invite-only setup guide:
  - `docs/admin-access-setup.md`
- Theme system implementation notes:
  - `docs/theme-system-implementation-plan.md`
