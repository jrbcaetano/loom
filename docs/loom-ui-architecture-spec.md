# Loom UI Architecture Spec

## Purpose

This document translates the Loom redesign direction into an implementation-ready frontend architecture for the existing Next.js application in `client/`.

It is designed to support:

1. A consistent multi-module UI system
2. Modal creation flows
3. Drawer-based editing on desktop and full-screen editing on mobile
4. Feature-flagged modular expansion
5. Migration from the current route-per-create and route-per-detail model

This spec is intentionally aligned with the current structure already present in the codebase:

1. `client/app/(app)/<module>/page.tsx`
2. `client/app/(app)/<module>/new/page.tsx`
3. `client/app/(app)/<module>/[entityId]/page.tsx`
4. `client/features/<module>/...`

The target architecture keeps the same domain boundaries while changing the interaction model and shared UI primitives.

---

## 1. Product Architecture

### 1.1 Modes

Loom should be reorganized around a stable set of workspace modes.

Primary modes:

1. `Home`
2. `Tasks`
3. `Calendar`
4. `Lists`
5. `Schedules`
6. `Family`
7. `More`

Secondary modules inside `More`:

1. `Meals`
2. `Chores`
3. `Rewards`
4. `Notes`
5. `Messages`
6. `Expenses`
7. `Documents`
8. `Routines`
9. `Settings`

### 1.2 Shell Model

Desktop shell:

1. Persistent left sidebar
2. Contextual top bar
3. Main canvas
4. Optional secondary panel
5. Right detail drawer for existing entities
6. Global command/search layer

Mobile shell:

1. Top app bar
2. Main content region
3. Bottom navigation with max 5 tabs
4. `More` sheet for secondary modules
5. Full-screen entity detail
6. Modal or full-screen create flow depending on complexity

### 1.3 Interaction Contract

The entire product must follow one interaction contract:

1. `Create` always opens a modal
2. `Open existing entity` always opens a right drawer on desktop
3. `Open existing entity` always opens a full-screen detail sheet on mobile
4. `Quick actions` stay inline
5. `Editing` never navigates away from the collection context

### 1.4 Route Strategy

The app should move from route-based edit pages to collection routes with query-param state.

Target route examples:

1. `/tasks?view=today&item=task_123`
2. `/calendar?range=week&item=event_456`
3. `/lists?list=shopping&item=item_789`
4. `/schedules?view=cycle&item=schedule_123`

Create routes should be replaced by modal state:

1. `/tasks?create=task`
2. `/calendar?create=event`
3. `/lists?create=list`

During migration, existing `/new` and `/[id]` routes should be preserved as compatibility entry points that redirect into collection routes and open the correct modal or drawer.

---

## 2. Target Frontend Architecture

### 2.1 Folder Structure

Recommended target structure under `client/`:

```text
client/
  app/
    (app)/
      home/page.tsx
      tasks/page.tsx
      calendar/page.tsx
      lists/page.tsx
      schedules/page.tsx
      family/
        members/page.tsx
        settings/page.tsx
      more/page.tsx
    api/
  components/
    primitives/
    patterns/
    entities/
    shell/
  features/
    shell/
    navigation/
    entities/
    home/
    tasks/
    calendar/
    lists/
    schedules/
    family/
    meals/
    chores/
    rewards/
    notes/
    messages/
    expenses/
    documents/
    routines/
  lib/
    routing/
    ui/
    entities/
    feature-flags/
  styles/
    tokens.css
    themes.css
    density.css
    components.css
```

### 2.2 Responsibilities

`app/`

1. Route entry points
2. Server composition
3. Data preloading and auth/family resolution
4. URL-driven state parsing

`features/`

1. Domain-specific server calls
2. Domain view models
3. Mode-specific containers
4. Create forms and detail content sections

`components/primitives/`

1. Buttons
2. Inputs
3. Dialogs
4. Sheet/drawer primitives
5. Chips
6. Avatar groups

`components/patterns/`

1. Toolbar
2. Filter bar
3. Collection layout
4. Empty states
5. Bulk action bar
6. View switchers

`components/entities/`

1. Shared entity row
2. Shared entity card
3. Shared detail layout
4. Shared activity feed
5. Shared comment thread

`components/shell/`

1. App shell
2. Sidebar
3. Bottom nav
4. Global top bar
5. More menu
6. Family switcher

`features/entities/`

1. Cross-entity type contracts
2. Shared metadata mappings
3. Drawer registry
4. Comment and audit abstractions

### 2.3 Core Providers

Recommended providers:

1. `ActiveFamilyProvider`
2. `FeatureAvailabilityProvider`
3. `DensityProvider`
4. `ViewPreferencesProvider`
5. `EntityDrawerProvider`
6. `CreateModalProvider`
7. `CommandPaletteProvider`

Provider responsibilities:

`ActiveFamilyProvider`

1. Current family
2. Switch action
3. Family-scoped caching boundary

`EntityDrawerProvider`

1. Currently open entity id
2. Entity type
3. Presentation mode based on breakpoint
4. URL synchronization

`CreateModalProvider`

1. Active create modal type
2. Create modal payload defaults
3. Open/close orchestration

### 2.4 URL State Contract

All collection pages should parse a common URL contract:

```ts
type CollectionRouteState = {
  view?: string;
  group?: string;
  sort?: string;
  filters?: string[];
  item?: string;
  create?: string;
  panel?: string;
};
```

Rules:

1. `item` controls the open drawer or mobile full-screen detail
2. `create` controls the open create modal
3. `view`, `group`, `sort`, and `filters` are mode-specific but follow shared naming
4. URL is the source of truth for shareable state

### 2.5 Responsive Rendering Rules

Desktop:

1. Collection remains visible when `item` is present
2. Drawer mounts on top of collection page
3. Secondary context panel is optional by mode

Mobile:

1. Collection hides when `item` is present
2. Full-screen detail mounts in place of collection
3. Back returns to collection preserving filters and scroll

---

## 3. Shared Entity System

### 3.1 Shared Entity UI Contract

Every entity in Loom should expose a normalized frontend shape.

```ts
type LoomEntityBase = {
  id: string;
  entityType:
    | "task"
    | "event"
    | "list"
    | "list_item"
    | "schedule"
    | "meal"
    | "chore"
    | "reward"
    | "note"
    | "message_thread"
    | "expense"
    | "document"
    | "routine";
  title: string;
  description?: string | null;
  familyId: string;
  visibility: "private" | "family" | "selected_members";
  assigneeIds?: string[];
  selectedMemberIds?: string[];
  labelIds?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
};
```

### 3.2 Shared Entity Detail Layout

Every existing item uses the same detail structure.

Detail sections:

1. `Header`
2. `Summary`
3. `Properties`
4. `Body`
5. `Related Items`
6. `Comments`
7. `Activity`

The layout component should be generic:

```tsx
<EntityDetailLayout
  entityType="task"
  title={task.title}
  statusSlot={<TaskStatusPicker />}
  propertiesSlot={<TaskProperties />}
  bodySlot={<TaskDescription />}
  relatedSlot={<TaskSubtasks />}
  commentsSlot={<EntityComments entityId={task.id} />}
  activitySlot={<EntityActivity entityId={task.id} />}
/>
```

### 3.3 Shared Metadata Controls

These controls must look and behave the same across modules:

1. Assignee picker
2. Visibility selector
3. Label picker
4. Date/time picker
5. Member selector for `selected_members`
6. Comment composer
7. Activity feed row

### 3.4 Shared Entity Row

`EntityRow` should be the dominant list primitive.

Anatomy:

1. Leading control
2. Title
3. Secondary metadata line
4. Assignee avatars
5. Labels
6. Status or date chip
7. Quick action area

Supported modes:

1. `comfortable`
2. `compact`

Supported variants:

1. `task`
2. `shopping_item`
3. `event`
4. `note`
5. `expense`
6. `document`

### 3.5 Comments and Audit

Comments and audit history should become a unified pattern under `features/entities`.

Recommended abstractions:

1. `EntityCommentsPanel`
2. `EntityActivityTimeline`
3. `EntityAuditEventRenderer`

Audit event examples:

1. Created
2. Renamed
3. Assigned
4. Visibility changed
5. Completed
6. Rescheduled
7. Imported from source

---

## 4. Shell and Navigation Architecture

### 4.1 Desktop Navigation

Left sidebar zones:

1. Family switcher
2. Primary mode navigation
3. Pinned smart views
4. More modules
5. Settings/profile actions

Recommended desktop nav order:

1. Home
2. Tasks
3. Calendar
4. Lists
5. Schedules
6. Family
7. More

Pinned smart views:

1. My Tasks
2. Today
3. Shopping
4. Upcoming
5. Unread

### 4.2 Mobile Navigation

Bottom tabs:

1. Home
2. Tasks
3. Calendar
4. Lists
5. More

Inside `More`:

1. Schedules
2. Family
3. Meals
4. Chores
5. Rewards
6. Notes
7. Messages
8. Expenses
9. Documents
10. Routines
11. Settings

### 4.3 Family Switching

Family switching should become a first-class shell control, not just a form field.

Behavior:

1. Always visible at top of shell
2. Shows active family name and role context
3. Switching family refreshes family-scoped data stores
4. Mode preferences may persist per family
5. Global search can optionally surface cross-family results with explicit family badges

### 4.4 Feature Flags

Feature-flagged modules should be registered through a central navigation registry.

Recommended type:

```ts
type LoomModeDefinition = {
  key: string;
  label: string;
  href: string;
  icon: string;
  placement: "primary" | "more" | "settings";
  featureKey?: string;
  mobileTabEligible?: boolean;
};
```

This replaces hardcoded per-shell branching and keeps expansion controlled.

---

## 5. Shared Components and Primitives

### 5.1 Shell Components

1. `AppShell`
2. `SidebarNav`
3. `BottomTabBar`
4. `ModeHeader`
5. `ModeToolbar`
6. `MoreModulesSheet`
7. `GlobalSearchTrigger`
8. `FamilySwitcherButton`

### 5.2 Collection Components

1. `CollectionLayout`
2. `CollectionHeader`
3. `CollectionToolbar`
4. `CollectionFilters`
5. `CollectionEmptyState`
6. `SelectionBar`
7. `ResponsiveSplitView`

### 5.3 Drawer Components

1. `EntityDrawerFrame`
2. `EntityDrawerHeader`
3. `EntityDrawerSection`
4. `EntityDrawerFooter`
5. `MobileEntityScreen`

Drawer sizing:

1. `420px` default
2. `520px` expanded
3. `640px` rare, used for rich entities only

### 5.4 Create Modal Components

1. `CreateEntityModal`
2. `CreateEntityHeader`
3. `CreateEntityFields`
4. `CreateEntityAdvanced`
5. `CreateEntityFooter`

Modal sizes:

1. `sm` for short entities
2. `md` for most creates
3. `lg` for event, schedule, expense split, or import review

### 5.5 Reusable Controls

1. `InlineEditableText`
2. `QuickAssignPopover`
3. `VisibilitySelect`
4. `LabelMultiSelect`
5. `MemberMultiSelect`
6. `DateTimeField`
7. `FilterChipBar`
8. `SortDropdown`
9. `GroupByDropdown`
10. `SavedViewDropdown`

---

## 6. Module Architecture

### 6.1 Home

Purpose:
Family command center and triage surface.

Layout:

1. Top summary strip
2. Configurable widget grid on desktop
3. Stacked priority sections on mobile

Shared widgets:

1. My tasks
2. Upcoming events
3. Shopping needed
4. Meals this week
5. Schedule snapshot
6. Family activity
7. Messages

Implementation notes:

1. Use server-composed dashboard data
2. Persist widget preferences
3. Clicking a widget item opens the related drawer in its native module route when possible

### 6.2 Tasks

Purpose:
Fast execution and lightweight planning.

Primary layout:

1. Left smart views or filters rail on desktop
2. Center list, board, or calendar canvas
3. Right task drawer

Primary components:

1. `TaskSmartViewRail`
2. `TaskListCanvas`
3. `TaskBoardCanvas`
4. `TaskCalendarCanvas`
5. `TaskDrawerContent`

Key implementation rules:

1. Inline complete
2. Inline assignee
3. Inline due date
4. Modal create
5. Drawer edit

### 6.3 Calendar

Purpose:
Specific dated coordination.

Primary layout:

1. Range switcher
2. Calendar grid or agenda
3. Optional side agenda on desktop
4. Event drawer

Primary components:

1. `CalendarRangeSwitcher`
2. `CalendarGrid`
3. `AgendaPanel`
4. `ExternalCalendarLayerControls`
5. `EventDrawerContent`

Rules:

1. Imported external items are visually quieter
2. Native items remain primary
3. Event editing stays in drawer/full-screen detail

### 6.4 Lists

Purpose:
Flexible shared lists with shopping specialization.

Primary layout:

1. List index
2. List item canvas
3. Item detail drawer

Primary components:

1. `ListIndexRail`
2. `ListItemsCanvas`
3. `ShoppingCategoryGroup`
4. `SmartImportModal`
5. `ListItemDrawerContent`

Rules:

1. Basic checking remains inline
2. Smart import is modal-based
3. Rich item metadata goes into drawer

### 6.5 Schedules

Purpose:
Cycle-based recurring structured routines.

Primary layout:

1. Schedule series rail
2. Cycle board
3. Override timeline or detail panel
4. Schedule drawer

Primary components:

1. `ScheduleSeriesList`
2. `CycleBoard`
3. `ScheduleBlockTimeline`
4. `ScheduleOverridesPanel`
5. `ScheduleDrawerContent`

Rules:

1. Must not be rendered as a generic calendar clone
2. Overrides and pauses have explicit visualization

### 6.6 Family

Purpose:
Members, roles, permissions, and family settings.

Primary layout:

1. Member list
2. Member detail drawer
3. Family settings sections

Primary components:

1. `FamilyMemberList`
2. `FamilyMemberDrawerContent`
3. `InviteMemberModal`
4. `FamilyRoleBadge`
5. `FamilySettingsPanel`

### 6.7 More Modules

`Meals`

1. Week planner canvas
2. Meal detail drawer
3. Add ingredients to shopping flow

`Chores`

1. Board or list by member/status
2. Completion inline
3. Recurrence and reward links in drawer

`Rewards`

1. Catalog and balance surfaces
2. Drawer for reward detail
3. Redemption modal

`Notes`

1. List + editor canvas
2. Metadata and comments in drawer

`Messages`

1. Thread list + conversation pane
2. Thread settings in drawer

`Expenses`

1. Table/list canvas
2. Summary cards
3. Expense drawer with splits and settlement

`Documents`

1. List/grid canvas
2. Preview or metadata drawer

`Routines`

1. Routine list
2. Sequence detail drawer
3. Modal create flow

---

## 7. Design Tokens and Styling Rules

### 7.1 Token Layers

Keep the token system in CSS variables and mirror key values in Tailwind theme extensions.

Recommended token groups:

1. Color
2. Typography
3. Spacing
4. Radius
5. Border
6. Shadow
7. Motion
8. Density

### 7.2 Core Tokens

Suggested semantic tokens:

```css
:root {
  --bg-base: #f6f5f2;
  --bg-elevated: #ffffff;
  --bg-subtle: #efede8;
  --surface-hover: #ebe8e1;
  --surface-selected: #e4e9f7;

  --text-primary: #18181b;
  --text-secondary: #4b5563;
  --text-muted: #6b7280;

  --border-default: #ded9d0;
  --border-strong: #c9c1b5;

  --accent-tasks: #3563e9;
  --accent-calendar: #1294a8;
  --accent-lists: #c88a19;
  --accent-schedules: #5a56d6;
  --accent-family: #527a4d;
  --accent-meals: #b9613c;
  --accent-chores: #2d7ea6;
  --accent-rewards: #b8860b;
  --accent-notes: #5f6b7a;
  --accent-messages: #9a4d78;
  --accent-expenses: #198754;
  --accent-documents: #58708a;
  --accent-routines: #7d4ea3;
}
```

### 7.3 Spacing Scale

Use:

1. `4`
2. `8`
3. `12`
4. `16`
5. `20`
6. `24`
7. `32`
8. `40`
9. `48`
10. `64`

### 7.4 Typography

Recommended UI font:

1. `Manrope`

Fallbacks:

1. `IBM Plex Sans`
2. `system-ui`

Recommended scale:

1. Display `32/40`
2. H1 `24/32`
3. H2 `20/28`
4. H3 `16/24`
5. Body `14/20`
6. Small `12/16`
7. Meta `11/14`

### 7.5 Density Modes

Two density modes:

1. `comfortable`
2. `compact`

Affected tokens:

1. Row height
2. Toolbar height
3. Drawer padding
4. Table spacing
5. Calendar density

---

## 8. Migration Strategy

### 8.1 Migration Goals

The current app already has:

1. Shared shell entry in `client/app/(app)/layout.tsx`
2. Existing feature boundaries in `client/features/*`
3. Route-based create pages
4. Route-based detail pages

The migration should preserve domain logic while replacing presentation patterns.

### 8.2 Route Migration Plan

Current:

1. `/tasks/new`
2. `/tasks/[taskId]`
3. `/calendar/new`
4. `/calendar/[eventId]`

Target:

1. `/tasks?create=task`
2. `/tasks?item=<id>`
3. `/calendar?create=event`
4. `/calendar?item=<id>`

Bridge behavior:

1. `/tasks/new` redirects to `/tasks?create=task`
2. `/tasks/[taskId]` redirects to `/tasks?item=<taskId>`
3. Same pattern repeated per module

### 8.3 Shared Primitive First Strategy

Build in this order:

1. Shell and navigation registry
2. Shared collection layout
3. Shared drawer and mobile detail shell
4. Shared create modal system
5. Shared entity metadata controls
6. Shared comments and audit pattern
7. Migrate Tasks, Lists, Calendar
8. Migrate Schedules and Family
9. Migrate remaining modules

### 8.4 Data and UI Mapping

Domain server modules should stay mostly intact:

1. `features/tasks/server.ts`
2. `features/events/server.ts`
3. `features/lists/server.ts`
4. `features/schedules/server.ts`

The main change should happen in:

1. View models
2. List and detail composition
3. Route state handling
4. Shared UI primitives

---

## 9. Screen-by-Screen Implementation Backlog

### Phase 0: Foundation

#### Epic 0.1 Shell Refactor

Scope:

1. Replace hardcoded nav groupings with a mode registry
2. Introduce `More` on mobile and desktop
3. Promote `Family` to a primary mode

Acceptance criteria:

1. Desktop sidebar reflects new mode order
2. Mobile bottom nav shows only 5 tabs
3. Feature flags still hide unavailable modules
4. Family switcher remains globally visible

Dependencies:

1. `AppShell`
2. Navigation registry
3. Feature availability provider

#### Epic 0.2 Shared URL State

Scope:

1. Add helpers for `item`, `create`, `view`, `group`, `sort`, `filters`
2. Parse and mutate shared route state

Acceptance criteria:

1. Collection pages can open drawers from URL
2. Collection pages can open create modals from URL
3. Back/forward navigation behaves correctly

#### Epic 0.3 Shared Drawer and Modal System

Scope:

1. Build drawer frame
2. Build mobile full-screen detail shell
3. Build create modal shell

Acceptance criteria:

1. Desktop uses right drawer
2. Mobile uses full-screen detail
3. Create modals support small, medium, large layouts

### Phase 1: Shared Entity Platform

#### Epic 1.1 Entity Detail Layout

Scope:

1. Create a generic detail layout
2. Add common metadata sections
3. Add common comments/activity sections

Acceptance criteria:

1. At least Tasks and Calendar can use the same detail shell
2. Shared metadata ordering is preserved
3. Comments and audit look identical across adopted modules

#### Epic 1.2 Shared Controls

Scope:

1. Assignee picker
2. Visibility selector
3. Label picker
4. Member picker
5. Date/time field

Acceptance criteria:

1. Controls are reusable across three modules minimum
2. Keyboard and mobile interaction both work

### Phase 2: Primary Mode Migration

#### Epic 2.1 Tasks Redesign

Priority: Highest

Scope:

1. Replace current task detail route with drawer/full-screen detail
2. Replace current create page with modal create
3. Standardize list, board, and calendar task canvases

Acceptance criteria:

1. Task open does not navigate away from collection
2. Task create opens modal from collection
3. Inline complete, due date, and assignee work
4. URL deep links still work

#### Epic 2.2 Lists Redesign

Priority: Highest

Scope:

1. Add list index + item canvas + item drawer pattern
2. Convert shopping import to review modal
3. Keep basic item check inline

Acceptance criteria:

1. Shopping flow supports import review
2. Category grouping works on desktop and mobile
3. Existing items open in drawer/full-screen detail

#### Epic 2.3 Calendar Redesign

Priority: Highest

Scope:

1. Introduce range switcher and shared toolbar
2. Convert event create to modal
3. Convert event details to drawer/full-screen detail
4. Add source controls for external calendars

Acceptance criteria:

1. Agenda, week, and month views share a single shell
2. Imported sources can be toggled
3. Event editing never needs a dedicated edit route

#### Epic 2.4 Home Redesign

Priority: High

Scope:

1. Build configurable widget-based command center
2. Tie widget interactions into target module routes

Acceptance criteria:

1. Widgets show family-scoped summaries
2. Clicking an item preserves context by opening in module context where possible

### Phase 3: Structured and Admin Modes

#### Epic 3.1 Schedules Redesign

Priority: High

Scope:

1. Replace generic page form flow with cycle-focused collection shell
2. Add overrides panel and structured block editor

Acceptance criteria:

1. Schedule series list and cycle board coexist on desktop
2. Overrides are discoverable and editable
3. Existing schedule opens in drawer/full-screen detail

#### Epic 3.2 Family Redesign

Priority: High

Scope:

1. Merge members and settings under clear `Family` mode
2. Add invite modal
3. Add member detail drawer

Acceptance criteria:

1. Member list and settings have a coherent family workspace
2. Roles and invitations are easy to access

### Phase 4: Secondary Module Adoption

#### Epic 4.1 Meals

1. Week planner shell
2. Add-to-shopping integration
3. Meal detail drawer

#### Epic 4.2 Chores and Rewards

1. Shared board/list shell
2. Completion and redemption patterns
3. Balance and fairness visibility

#### Epic 4.3 Notes and Messages

1. Reading and composition canvases
2. Shared comments and metadata drawers

#### Epic 4.4 Expenses and Documents

1. Table/list shell
2. Metadata-heavy drawer flows

#### Epic 4.5 Routines

1. Lightweight checklist-based detail model
2. Drawer/full-screen detail adoption

### Phase 5: Polish and Expansion

#### Epic 5.1 Saved Views and Search

1. Saved filters
2. Command palette
3. Cross-module quick open

#### Epic 5.2 Density and Preferences

1. Comfortable/compact mode rollout
2. Per-mode preference persistence

#### Epic 5.3 Accessibility and QA

1. Keyboard navigation
2. Focus management in drawers and modals
3. Screen reader labels
4. Empty, error, and loading state consistency

---

## 10. Example Flow Definitions

### Flow A: Task Create to Task Edit

1. User opens `Tasks`
2. User clicks `New Task`
3. URL becomes `/tasks?create=task`
4. Task create modal opens
5. User enters title, assignee, due date, visibility
6. Modal submits and closes
7. URL clears `create`
8. New row appears in collection
9. User opens the task
10. URL becomes `/tasks?view=today&item=<taskId>`
11. Drawer opens on desktop or full-screen detail on mobile
12. User adds comment and updates visibility
13. Collection remains preserved

### Flow B: Shopping Smart Import

1. User opens `Lists > Shopping`
2. User clicks `Import`
3. URL becomes `/lists?list=shopping&create=shopping-import`
4. Smart import modal opens
5. User pastes unstructured content
6. System parses items, quantities, duplicate suggestions, and categories
7. User reviews and confirms
8. Modal closes
9. Collection refreshes grouped by category
10. User opens one item for richer metadata
11. URL becomes `/lists?list=shopping&item=<itemId>`
12. Item detail drawer opens

---

## 11. Suggested First Build Slice

If the team wants the fastest path to visible improvement with the least churn, start with this slice:

1. Refactor `AppShell` into mode registry + new mobile nav behavior
2. Add shared route-state helpers
3. Build shared `EntityDrawerFrame`
4. Build shared `CreateEntityModal`
5. Migrate `Tasks`
6. Migrate `Lists`
7. Migrate `Calendar`

This sequence establishes the dominant interaction language for the whole product.

---

## 12. Notes for the Existing Codebase

Specific implications for the current repository:

1. `client/app/(app)/layout.tsx` is already the correct shell entry point and should stay that way
2. `client/components/layout/app-shell.tsx` should become a thinner shell composed from registry-driven sections
3. Existing feature folders under `client/features/*` are worth keeping
4. Current `/new` and `/[id]` pages should become compatibility shims during migration
5. `client/features/shared` is the right seed location for entity-level shared validation and typing, but a dedicated `features/entities` package would scale better

This lets Loom evolve from a set of module pages into one cohesive family coordination workspace without throwing away its current domain separation.
