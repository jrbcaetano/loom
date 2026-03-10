# Loom Design System Sync

This pass introduces a global design-system layer that applies consistent spacing, typography, shell widths, and component weight across all app modules.

## Source of truth

- `client/styles/tokens.css`: core colors, radii, shadows, font-weight tokens.
- `client/styles/design-system.css`: semantic layout/type/component rules shared by all feature pages.
- `client/app/globals.css`: imports `design-system.css` last so canonical styles override page-specific drift.

## Shared classes stabilized

- `loom-main-inner`, `loom-main-body`: unified shell width and body padding.
- `loom-module-page`, `loom-module-title`, `loom-module-subtitle`: page structure and heading hierarchy.
- `loom-card`, `loom-filter-card`: card shape and border consistency.
- `loom-form-stack`, `loom-form-actions`: common form rhythm.
- `loom-nav-link`, `loom-nav-dot`, `loom-header-icon`, `loom-header-avatar`: nav/header visual scale consistency.
- Lists-specific harmony:
  - `loom-lists-page .loom-module-title`
  - `loom-lists-card-title`
  - `loom-lists-detail-title`
  - `loom-lists-stat-value`

## Future styling rule

When adding a new page:

1. Compose with existing semantic classes first (`loom-module-page`, `loom-card`, etc).
2. Add feature-specific classes to `components.css` only when unique behavior is needed.
3. Keep shared visual primitives in `design-system.css` so changes propagate globally.
