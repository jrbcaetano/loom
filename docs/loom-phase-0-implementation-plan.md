# Loom Phase 0 Implementation Plan

## Goal

Phase 0 establishes the shared UI infrastructure required for the Loom redesign without forcing an immediate rewrite of every module.

This phase should deliver:

1. A registry-driven shell and navigation system
2. A shared URL state model for modal and drawer interactions
3. A shared drawer shell for existing entities
4. A shared create modal shell
5. Compatibility bridges from current `/new` and `/[id]` routes

This plan is tailored to the current codebase in `client/`.

---

## Scope

### In Scope

1. Shell architecture
2. Navigation model
3. Shared route-state utilities
4. Shared responsive detail presentation
5. Shared create modal presentation
6. Foundation styling tokens required by those patterns

### Out of Scope

1. Full module redesigns
2. Rewriting all domain forms
3. Rebuilding module-specific canvases
4. Changing server-side domain logic

---

## Current State

The current codebase already provides a strong starting point:

1. Shared app shell entry at [client/app/(app)/layout.tsx](c:\workspace\Loom\client\app\(app)\layout.tsx)
2. Existing shell component at [client/components/layout/app-shell.tsx](c:\workspace\Loom\client\components\layout\app-shell.tsx)
3. Feature-based domain organization under `client/features`
4. Route-per-create and route-per-detail patterns in `client/app/(app)/*`
5. Existing style layers in:
   [client/styles/tokens.css](c:\workspace\Loom\client\styles\tokens.css)
   [client/styles/base.css](c:\workspace\Loom\client\styles\base.css)
   [client/styles/layout.css](c:\workspace\Loom\client\styles\layout.css)
   [client/styles/components.css](c:\workspace\Loom\client\styles\components.css)
   [client/styles/design-system.css](c:\workspace\Loom\client\styles\design-system.css)
   [client/styles/themes.css](c:\workspace\Loom\client\styles\themes.css)

The main gap is that shell behavior, create flows, and detail flows are not yet standardized as shared systems.

---

## Deliverables

### Deliverable 1: Mode Registry

Create a central registry for product modes and module placement.

Purpose:

1. Remove shell navigation hardcoding
2. Allow feature-flag-driven placement
3. Support desktop and mobile navigation rules from one source

### Deliverable 2: Shared Route-State Helpers

Create a common route-state layer for collection screens.

Purpose:

1. Support `item` query params for detail views
2. Support `create` query params for modal flows
3. Support `view`, `group`, `sort`, and filters consistently

### Deliverable 3: Shared Detail Presentation

Create one responsive detail shell:

1. Right drawer on desktop
2. Full-screen detail on mobile

### Deliverable 4: Shared Create Presentation

Create one modal shell for creation flows with common layout behavior.

### Deliverable 5: Route Compatibility Bridges

Keep old route entry points working while redirecting them into the new interaction model.

---

## File Plan

## 1. Shell and Navigation

### New files

1. [client/features/navigation/mode-registry.ts](c:\workspace\Loom\client\features\navigation\mode-registry.ts)
2. [client/features/navigation/nav-groups.ts](c:\workspace\Loom\client\features\navigation\nav-groups.ts)
3. [client/components/shell/sidebar-nav.tsx](c:\workspace\Loom\client\components\shell\sidebar-nav.tsx)
4. [client/components/shell/bottom-tab-bar.tsx](c:\workspace\Loom\client\components\shell\bottom-tab-bar.tsx)
5. [client/components/shell/more-modules-sheet.tsx](c:\workspace\Loom\client\components\shell\more-modules-sheet.tsx)
6. [client/components/shell/family-switcher-button.tsx](c:\workspace\Loom\client\components\shell\family-switcher-button.tsx)

### Existing files to refactor

1. [client/components/layout/app-shell.tsx](c:\workspace\Loom\client\components\layout\app-shell.tsx)
2. [client/features/families/active-family-switcher.tsx](c:\workspace\Loom\client\features\families\active-family-switcher.tsx)
3. [client/lib/product-features.ts](c:\workspace\Loom\client\lib\product-features.ts)

### Implementation notes

1. Extract nav metadata from `app-shell.tsx` into a registry
2. Add `placement` metadata: `primary`, `more`, `settings`
3. Mark mobile-tab-eligible modes explicitly
4. Keep unread count support in the shell layer, not in mode definitions

---

## 2. Shared Route State

### New files

1. [client/lib/routing/collection-route-state.ts](c:\workspace\Loom\client\lib\routing\collection-route-state.ts)
2. [client/lib/routing/use-collection-route-state.ts](c:\workspace\Loom\client\lib\routing\use-collection-route-state.ts)
3. [client/lib/routing/route-state-helpers.ts](c:\workspace\Loom\client\lib\routing\route-state-helpers.ts)

### Optional supporting files

1. [client/types/route-state.ts](c:\workspace\Loom\client\types\route-state.ts)

### Responsibilities

`collection-route-state.ts`

1. Parse `URLSearchParams`
2. Normalize arrays and defaults
3. Return typed route state

`use-collection-route-state.ts`

1. Read from Next navigation hooks
2. Expose helpers for setting `item`, `create`, `view`, `sort`, and filters
3. Preserve unrelated query params when updating

`route-state-helpers.ts`

1. Serialize state back to URL
2. Support push vs replace semantics

### Acceptance criteria

1. A collection page can open an item without a dedicated route
2. A collection page can open a create modal without a dedicated route
3. Back button closes modal or drawer before leaving the page

---

## 3. Shared Detail Presentation

### New files

1. [client/components/patterns/entity-drawer-frame.tsx](c:\workspace\Loom\client\components\patterns\entity-drawer-frame.tsx)
2. [client/components/patterns/mobile-entity-screen.tsx](c:\workspace\Loom\client\components\patterns\mobile-entity-screen.tsx)
3. [client/components/patterns/entity-detail-presenter.tsx](c:\workspace\Loom\client\components\patterns\entity-detail-presenter.tsx)
4. [client/components/patterns/entity-drawer-header.tsx](c:\workspace\Loom\client\components\patterns\entity-drawer-header.tsx)
5. [client/components/patterns/entity-drawer-section.tsx](c:\workspace\Loom\client\components\patterns\entity-drawer-section.tsx)

### Existing files to reference

1. [client/components/common/responsive-panel.tsx](c:\workspace\Loom\client\components\common\responsive-panel.tsx)

### Responsibilities

`entity-detail-presenter.tsx`

1. Decide between drawer and full-screen detail based on viewport
2. Accept a shared title, metadata, and children contract
3. Handle close action through route-state helpers

### Acceptance criteria

1. Same component works in desktop and mobile
2. Close behavior is URL-driven
3. Scrolling and sticky header behavior are consistent

---

## 4. Shared Create Presentation

### New files

1. [client/components/patterns/create-entity-modal.tsx](c:\workspace\Loom\client\components\patterns\create-entity-modal.tsx)
2. [client/components/patterns/create-entity-layout.tsx](c:\workspace\Loom\client\components\patterns\create-entity-layout.tsx)
3. [client/components/patterns/create-entity-footer.tsx](c:\workspace\Loom\client\components\patterns\create-entity-footer.tsx)

### Responsibilities

1. Standard modal header
2. Standard field region
3. Advanced settings slot
4. Sticky footer behavior on mobile
5. Route-state close behavior

### Acceptance criteria

1. Modal can wrap an existing module form
2. Small, medium, and large size variants exist
3. Forms do not need to know whether they are in a page or modal shell

---

## 5. Entity Infrastructure Seed

### New files

1. [client/features/entities/types.ts](c:\workspace\Loom\client\features\entities\types.ts)
2. [client/features/entities/entity-presenters.ts](c:\workspace\Loom\client\features\entities\entity-presenters.ts)
3. [client/features/entities/detail-registry.tsx](c:\workspace\Loom\client\features\entities\detail-registry.tsx)

### Purpose

This is a light seed, not the full entity platform.

Responsibilities:

1. Define normalized entity type ids
2. Map entity type to presenter
3. Allow module-specific detail content to mount inside shared shells

### Acceptance criteria

1. At least one module can register a detail presenter
2. Shared shell stays generic while content remains module-specific

---

## 6. Styling

### Existing files to extend

1. [client/styles/tokens.css](c:\workspace\Loom\client\styles\tokens.css)
2. [client/styles/layout.css](c:\workspace\Loom\client\styles\layout.css)
3. [client/styles/components.css](c:\workspace\Loom\client\styles\components.css)
4. [client/styles/design-system.css](c:\workspace\Loom\client\styles\design-system.css)

### New CSS concerns

Add tokens or classes for:

1. Drawer widths
2. Modal sizes
3. Shell spacing rhythm
4. Dense vs comfortable list heights
5. Surface hierarchy for drawer and modal

### Acceptance criteria

1. Drawer and modal components have reusable visual styles
2. No module-specific styling is embedded in the new shared primitives

---

## 7. Route Compatibility Bridges

### Existing files to edit later during adoption

1. [client/app/(app)/tasks/new/page.tsx](c:\workspace\Loom\client\app\(app)\tasks\new\page.tsx)
2. [client/app/(app)/tasks/[taskId]/page.tsx](c:\workspace\Loom\client\app\(app)\tasks\[taskId]\page.tsx)
3. [client/app/(app)/calendar/new/page.tsx](c:\workspace\Loom\client\app\(app)\calendar\new\page.tsx)
4. [client/app/(app)/calendar/[eventId]/page.tsx](c:\workspace\Loom\client\app\(app)\calendar\[eventId]\page.tsx)
5. [client/app/(app)/lists/new/page.tsx](c:\workspace\Loom\client\app\(app)\lists\new\page.tsx)
6. [client/app/(app)/lists/[listId]/page.tsx](c:\workspace\Loom\client\app\(app)\lists\[listId]\page.tsx)

### Bridge behavior

Examples:

1. `/tasks/new` redirects to `/tasks?create=task`
2. `/tasks/[taskId]` redirects to `/tasks?item=<taskId>`
3. `/calendar/new` redirects to `/calendar?create=event`
4. `/calendar/[eventId]` redirects to `/calendar?item=<eventId>`

This bridge work is best done module-by-module during Phase 1 and Phase 2, but it should be planned now.

---

## Execution Sequence

## Step 1: Extract Navigation Registry

Files:

1. [client/features/navigation/mode-registry.ts](c:\workspace\Loom\client\features\navigation\mode-registry.ts)
2. [client/components/layout/app-shell.tsx](c:\workspace\Loom\client\components\layout\app-shell.tsx)

Tasks:

1. Move nav definitions out of `app-shell.tsx`
2. Add mode placement metadata
3. Add mobile-tab eligibility metadata
4. Preserve existing feature gating

Definition of done:

1. `app-shell.tsx` renders from registry, not local arrays

## Step 2: Split Shell Rendering

Files:

1. [client/components/shell/sidebar-nav.tsx](c:\workspace\Loom\client\components\shell\sidebar-nav.tsx)
2. [client/components/shell/bottom-tab-bar.tsx](c:\workspace\Loom\client\components\shell\bottom-tab-bar.tsx)
3. [client/components/shell/more-modules-sheet.tsx](c:\workspace\Loom\client\components\shell\more-modules-sheet.tsx)

Tasks:

1. Move desktop nav rendering out of `AppShell`
2. Move mobile nav rendering out of `AppShell`
3. Add `More` module behavior

Definition of done:

1. Shell subcomponents exist and own nav rendering

## Step 3: Introduce Route-State Helpers

Files:

1. [client/lib/routing/collection-route-state.ts](c:\workspace\Loom\client\lib\routing\collection-route-state.ts)
2. [client/lib/routing/use-collection-route-state.ts](c:\workspace\Loom\client\lib\routing\use-collection-route-state.ts)

Tasks:

1. Create typed parsing helpers
2. Create mutation helpers
3. Add tests if a test setup already exists later

Definition of done:

1. A component can open and close `item` and `create` purely by changing query params

## Step 4: Create Shared Detail Shell

Files:

1. [client/components/patterns/entity-detail-presenter.tsx](c:\workspace\Loom\client\components\patterns\entity-detail-presenter.tsx)
2. [client/components/patterns/entity-drawer-frame.tsx](c:\workspace\Loom\client\components\patterns\entity-drawer-frame.tsx)
3. [client/components/patterns/mobile-entity-screen.tsx](c:\workspace\Loom\client\components\patterns\mobile-entity-screen.tsx)

Tasks:

1. Add responsive presentation
2. Add shared close behavior
3. Add sticky header/body structure

Definition of done:

1. A sample screen can mount the presenter with dummy content

## Step 5: Create Shared Create Modal

Files:

1. [client/components/patterns/create-entity-modal.tsx](c:\workspace\Loom\client\components\patterns\create-entity-modal.tsx)
2. [client/components/patterns/create-entity-layout.tsx](c:\workspace\Loom\client\components\patterns\create-entity-layout.tsx)

Tasks:

1. Add modal variants
2. Add route-state controlled open/close
3. Add standard header/footer composition

Definition of done:

1. A sample screen can mount a wrapped create form

## Step 6: Seed Entity Presenter Registry

Files:

1. [client/features/entities/types.ts](c:\workspace\Loom\client\features\entities\types.ts)
2. [client/features/entities/detail-registry.tsx](c:\workspace\Loom\client\features\entities\detail-registry.tsx)

Tasks:

1. Define shared entity ids
2. Register first presenters
3. Keep registry simple until full entity system lands

Definition of done:

1. One module can resolve detail content by entity type

---

## Suggested First Implementation Slice

The safest first vertical slice is:

1. Navigation registry
2. Route-state helpers
3. Detail presenter shell
4. Create modal shell
5. Tasks module proof of concept

Why Tasks first:

1. It already has strong list interaction needs
2. It benefits immediately from drawer-based editing
3. It will validate inline actions plus modal create
4. It sets the interaction language for the rest of the product

---

## Risks and Mitigations

### Risk 1: Shell Refactor Becomes Too Large

Mitigation:

1. Extract registry first without changing visuals much
2. Split visual redesign from shell decomposition

### Risk 2: Route-State Logic Becomes Inconsistent

Mitigation:

1. Centralize parsing and serialization
2. Do not let modules hand-roll query param behavior

### Risk 3: Current `/new` and `/[id]` Routes Break Deep Links

Mitigation:

1. Keep compatibility routes
2. Redirect rather than delete

### Risk 4: Shared Drawer Is Too Generic Too Early

Mitigation:

1. Keep shell generic, content module-specific
2. Do not over-abstract module fields in Phase 0

---

## Recommended Team Breakdown

If multiple people are working in parallel:

1. Shell/navigation owner
2. Routing/state owner
3. Shared detail/create shell owner
4. First module adoption owner

This keeps write scopes mostly separated.

---

## Exit Criteria for Phase 0

Phase 0 is complete when:

1. Shell navigation is registry-driven
2. Mobile supports `More` instead of an oversized tab bar
3. Shared route-state helpers exist and are used by at least one screen
4. Shared detail shell exists and is responsive
5. Shared create modal shell exists
6. One module can prove the new interaction model end-to-end

At that point, Phase 1 can start with confidence.
