# Loom Source-Informed Product And Architecture Brief

Use this document as context for architecture, design-pattern, state-management, domain-modeling, and UX-structure analysis of the Loom application.

## 1. Product Summary

Loom is a mobile-first family coordination web app. It is not a single-purpose planner. It combines shared family communication, household coordination, lightweight records management, scheduling, and product-level access/admin controls inside one authenticated workspace.

The product is centered around a **family workspace**. A signed-in user can belong to one or more families, and the app stores an active family selection in user settings. Most feature data is scoped to the active family.

The application is designed for both mobile and desktop, but the structure and navigation are clearly mobile-first:

- persistent mobile bottom navigation for top-level areas
- a mobile "more" drawer for overflow areas
- a desktop sidebar with grouped navigation
- token-driven theming and density settings applied globally

## 2. Core Conceptual Model

The product has three important levels of scope:

1. Product scope
The whole application can be invite-only. Product admins can manage global access invites, feature flags, and push-event flags.

2. User scope
Each authenticated user has a profile and personal preferences such as locale, regional date/time formatting, theme, density, and active family.

3. Family scope
Most operational data belongs to a family: tasks, lists, events, schedules, messages, notes, expenses, meals, chores, rewards, documents, routines, and family settings.

This creates a multi-tenant-but-personalized model:

- globally controlled app access
- user-level identity and preferences
- family-level collaborative data
- some personal data embedded inside family features, such as personal task labels or user assignment

## 3. Users, Roles, And Access

### Authentication

The app supports:

- email/password auth
- Google sign-in/sign-up
- forgot password flow

### Product access model

The application can run in invite-only mode.

- Registration for non-invited users can be blocked by database trigger logic.
- Product admins can create, revoke, activate, deactivate, and delete access invites.
- Access invites track lifecycle metadata such as status, expiry, acceptance, activation, source, and actor history.
- Access invites can come from product admins, family invites, or self-registration flows depending on system state.

### Product admin model

Product admins are a separate authority layer above normal family membership.

They can manage:

- app access invites
- product feature flags
- push notification event flags

Product admin enforcement exists at multiple layers:

- page guards
- API/service layer
- Supabase RLS / RPC logic

### Family roles

Family members have roles:

- `admin`
- `adult`
- `child`

Family membership also has status:

- `active`
- `invited`
- `inactive`

Invites can exist before a user account is claimed. When a user signs in, the app can claim pending family invites for the current user.

## 4. Family Workspace Model

A family is the main collaborative unit.

Family capabilities include:

- creating a family during onboarding
- inviting members by email
- assigning member roles
- viewing active and invited members
- switching between multiple families
- family-level settings
- family-level external calendar feeds

There is at least one concrete family setting already modeled:

- `allowMultipleLists`

That setting controls whether the family can create and use multiple lists, or only the default system Shopping List.

## 5. Main Information Architecture

The app shell groups functionality roughly like this:

### Primary areas

- Home
- Tasks
- Lists
- Calendar
- Schedules
- Notifications

### Family operations

- Meals
- Chores
- Rewards
- Notes

### Shared records and communication

- Messages
- Expenses
- Documents
- Routines

### Family/admin settings

- Family members
- Family settings
- User settings
- Product admin area for product admins

Feature visibility can be controlled through product feature flags, so navigation is dynamic.

## 6. Home Dashboard

The home page is customizable per user through widget preferences.

Current widget catalog:

- upcoming events
- quick stats
- shopping list
- tasks
- weekly meals
- chores and rewards
- weather

Each widget can be enabled or disabled. The weather widget also has settings:

- location
- unit (`celsius` or `fahrenheit`)

The dashboard model suggests Loom wants a configurable landing page rather than a fixed dashboard.

## 7. Feature Modules

### 7.1 Tasks

Tasks are one of the richer domains in the app.

Task model includes:

- title
- description
- status
- priority
- start date/time
- due date/time
- assignee
- family
- owner
- visibility
- selected shared members
- labels
- created/updated timestamps

Task statuses:

- `inbox`
- `planned`
- `in_progress`
- `waiting`
- `done`

There is normalization from older aliases like `todo`, `next`, and `doing`, which implies evolving workflow semantics.

Task priorities:

- `low`
- `medium`
- `high`

Task labels exist in two scopes:

- `personal`
- `family`

Task behaviors include:

- create/edit/archive
- assignment
- due/start scheduling
- visibility control
- selected-member sharing
- label assignment
- filtering by mine/status/priority
- comments
- audit history

Important behavior:

- if a task has a due date and is still in `inbox`, creation/update logic promotes it to `planned`
- changes to status, assignee, and due date generate audit entries in `task_comments`
- comments and audit entries share the same stream with `entryKind = comment|audit`

This means tasks are not just static records; they have lifecycle transitions and a built-in activity log.

### 7.2 Lists

Lists are family-scoped and can also be shared selectively.

List model includes:

- title
- description
- visibility
- owner
- archived state
- family
- categories
- items

Lists support:

- private / family / selected-members visibility
- item-level completion
- item sorting
- quantities
- prices
- categories
- participant stats
- recent list summaries

There is a special **system Shopping List** with special rules:

- always exists or is auto-created
- cannot be renamed freely
- cannot be deleted
- visibility is always `family`
- default shopping categories are auto-managed

Family setting `allowMultipleLists` affects whether families can create additional lists or only use the Shopping List.

List item behaviors include:

- duplicate prevention by normalized item text
- update existing item instead of inserting duplicate
- completed state tracking
- created/updated by metadata
- optional imported source metadata

There is also category translation support, which matters for multilingual UX.

#### Special capability: recent purchase import

The Shopping List supports import of recent purchase items from receipt PDFs.

This is a significant non-trivial feature:

- parses uploaded PDFs
- extracts text from PDF pages
- applies store-specific heuristics
- supports at least Continente-style and Lidl-style receipt patterns
- infers categories from receipt sections or item descriptions
- stores import source type/name metadata
- merges imported items into the Shopping List

This means Loom includes a semi-intelligent household commerce workflow, not just manual lists.

### 7.3 Calendar / Events

Events are family-scoped shared calendar items.

Event model includes:

- title
- description
- start/end
- location
- all-day flag
- visibility
- recurrence rule
- creator metadata

Events support:

- create/edit/archive
- private / family / selected-members visibility
- recurrence rules
- selected-member sharing

Recurrence schema supports:

- daily
- weekly
- monthly
- yearly
- interval
- weekday rules
- month-day rules
- month rules
- set-position rules
- count
- until

This makes the event system meaningfully richer than a simple one-off calendar entry system.

#### External calendars

Families can configure external calendar feeds.

External calendar support includes:

- URL-based ICS/webcal feeds
- normalization of Google Calendar public feed URLs
- ICS parsing
- recurrence parsing and expansion
- all-day handling
- timezone handling
- trimming to a useful event range

This means the calendar domain merges:

- internal Loom events
- external subscribed calendar events

### 7.4 Schedules

Schedules are distinct from generic calendar events. They model repeatable structured routines for specific family members.

This is one of the most specialized domains in the product.

Schedule series include:

- family member target
- title
- category (`work`, `school`, `sport`, `custom`)
- color
- location
- notes
- starts-on / ends-on
- cycle length in weeks
- enabled flag
- archived flag

Schedules contain **blocks**:

- week index within cycle
- weekday
- start/end local times
- next-day span flag
- sort order
- optional template link

Schedules also contain:

- pauses with date ranges and reason
- override days with override blocks
- reusable schedule templates

Special rule:

- `work` schedules require an end date

The presence of cycle lengths, blocks, pauses, and override days means this is not ordinary recurrence. It is closer to rota/timetable modeling.

This is useful for:

- school timetables
- work shifts
- sports practice cycles
- custody or routine rotations

The app can also expand schedule series into occurrences for a date range.

### 7.5 Messages

Messaging is family-scoped and supports:

- family-wide conversation
- direct conversations between family members

Conversation summary model includes:

- type (`family` or `direct`)
- last message
- last message time
- unread count
- other member names

Message behaviors include:

- ensuring a default family conversation exists
- direct conversation creation via RPC
- unread tracking
- mark conversation read
- push notifications on new messages

This is not a generic chat platform; it is purpose-built family communication inside the shared workspace.

### 7.6 Notifications

Notifications are user-facing inbox items stored in the database.

Notification types currently include:

- `task_assigned`
- `list_shared`
- `event_created`
- `general`

Notifications include:

- title
- body
- read/unread
- creation time
- optional related entity type/id

The app shell surfaces unread counts and refreshes them both through polling/focus events and Supabase realtime subscriptions.

### 7.7 Meals

Meals combine recipe management and meal planning.

Recipe model includes:

- title
- description
- instructions
- ingredients

Ingredient model includes:

- name
- quantity
- unit

Meal plan entries include:

- family
- recipe
- date
- meal type
- notes

Meal types:

- breakfast
- lunch
- dinner

Special behavior:

- recipe ingredients can be added to a shopping list

This ties meal planning directly into household shopping workflows.

### 7.8 Chores And Rewards

Chores model:

- title
- description
- assignee
- points
- due date
- status (`todo` or `done`)

Behaviors:

- create/edit/delete
- complete chore through RPC

Rewards appear to be a point-balance system derived from chore completion.

Rewards model includes:

- reward balance per user
- reward transactions

This suggests a family motivation/gamification layer, likely especially relevant for children.

### 7.9 Notes

Notes are simple family-scoped records with:

- title
- content
- category
- created/updated metadata

Supports search by title.

### 7.10 Expenses

Expenses model includes:

- title
- amount
- currency
- category
- paid by user
- date
- notes

Supports:

- create/edit/delete
- search
- monthly summary aggregation

This is lightweight family expense tracking rather than full accounting.

### 7.11 Documents

Documents model includes:

- title
- description
- category
- file URL
- creator

This is essentially family document metadata/reference storage.

### 7.12 Routines

Routines model includes:

- title
- assignee
- schedule type (`daily`, `weekly`, `custom`)
- ordered steps

Also includes completion logs:

- who completed it
- when it was completed

This is closer to procedural routines/checklists than calendar schedules.

## 8. Visibility And Sharing Model

Several major domains use the same visibility concept:

- tasks
- lists
- events

Visibility modes:

- `private`
- `family`
- `selected_members`

For `selected_members`, the app stores explicit share rows in a generic `entity_shares` table-like structure with:

- entity type
- entity id
- shared-with user
- permission

This is important architecturally because it shows Loom has a reusable selective-sharing pattern across multiple feature domains.

## 9. Settings And Preferences

### User profile

User profile includes:

- full name
- email
- avatar URL
- preferred locale

### Locale / i18n

The app uses a dictionary-based i18n system with at least:

- English (`en`)
- Portuguese (`pt`)

### Regional settings

Regional settings are separate from locale and include:

- date format: `locale`, `dd_mm_yyyy`, `mm_dd_yyyy`, `yyyy_mm_dd`
- time format: `locale`, `12h`, `24h`

This separation matters because language and date/time format are not treated as the same preference.

### Theme system

Themes:

- `loom`
- `loom-dark`
- `hearth`

Density modes:

- `comfortable`
- `compact`

Theme and density are independent preferences.

The styling system is token-driven and applied globally, which suggests the design system is intended to scale cleanly as features grow.

## 10. Product Feature Flags

Feature flags exist at the product level and can enable/disable whole modules in navigation and route availability logic.

Known feature keys include:

- tasks
- lists
- calendar
- schedules
- notifications
- meals
- chores
- rewards
- notes
- messages
- expenses
- documents
- routines
- family_members
- family_settings
- settings

This implies Loom is being developed as a modular product platform where capabilities can be progressively rolled out or hidden.

## 11. Push Notifications

Push notification support is built in.

Capabilities include:

- storing browser push subscriptions
- associating subscriptions with user and active family
- VAPID-based web push
- removing expired subscriptions
- push-event flags to globally enable/disable specific push event types

At least one push event is wired today:

- new message notifications to conversation members

This means notification delivery has both:

- in-app notification model
- browser/web push model

## 12. Technical Architecture

### Frontend

- Next.js App Router
- TypeScript
- React 19
- server components + client components
- route groups for auth/app flows

### Data and auth

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Realtime
- RLS as source of truth

### Validation and forms

- Zod for input validation
- React Hook Form for forms

### Client data state

- TanStack React Query

### Styling

- token-driven CSS layers
- theme tokens
- layout/components/base/themes separation

### Other libraries/capabilities

- `pdf-parse`
- `tesseract.js`
- `web-push`
- `date-fns`
- `next-intl`

### Server-side companion

There is also a small separate Express server workspace, but it currently appears minimal and non-core. The actual business logic lives in the Next.js app plus Supabase.

## 13. Architectural Style In Practice

The codebase suggests the following practical architecture:

- route-level pages in `client/app`
- feature-centric modules in `client/features`
- feature `server.ts` files containing domain operations
- shared domain validation in Zod
- heavy reliance on Supabase tables, RPCs, and RLS
- some domain logic in TypeScript service functions
- global shell/navigation driven by feature flags and unread counts

The app is not a pure CRUD app, but it also is not using a heavy DDD/CQRS/event-sourcing architecture. It is closer to:

- feature-modular full-stack Next.js app
- with domain services
- with database-enforced authorization
- with selected reusable cross-cutting patterns

Cross-cutting patterns already visible:

- active-family context
- selective sharing via generic `entity_shares`
- product feature flags
- push event flags
- audit/comment streams
- theme/density preference system
- source-backed invite/access lifecycle

## 14. Important Domain Tensions And Complexity Areas

These are the parts of Loom most likely to benefit from design-pattern analysis:

### 1. Product admin vs family admin boundaries

There are two authority systems:

- product admins for platform governance
- family admins/adults/children for workspace governance

This creates permission-boundary complexity.

### 2. Multi-family users with one active family

Users can belong to multiple families, but the runtime UX often depends on a single active family context.

### 3. Mixed scope data

The app mixes:

- global settings
- user preferences
- family data
- entity-level selective sharing

This creates challenges for state boundaries, caching, and authorization clarity.

### 4. Similar but different time domains

Loom has both:

- calendar events with recurrence
- member schedules with cyclic blocks, pauses, and overrides
- routines with steps and completion logs

These are related but not interchangeable concepts.

### 5. Smart import and external integrations

The app already contains:

- receipt parsing/import logic
- external ICS calendar ingestion
- push delivery

This creates integration complexity that goes beyond internal CRUD.

### 6. Modular product expansion

Because many domains exist already and are feature-flagged, the app likely needs patterns that prevent the shell, settings, permissions, and shared infrastructure from becoming tangled as more modules are added.

## 15. If You Want ChatGPT To Analyze Design Patterns

You can paste the following request after this brief:

"Based on this application description, recommend the best software and frontend design patterns for a mobile-first, multi-module family coordination app. Focus on patterns for domain boundaries, state management, permissions, feature modularity, scheduling/time-based domains, cross-cutting services like notifications and imports, and long-term maintainability in a Next.js + Supabase architecture. Distinguish between patterns that fit now versus patterns that would be overengineering."
