# Theme System Implementation Plan

## Branch

- Working branch: `codex/theme-system-foundation`

## Goal

Introduce a first-class theme system for Loom that supports:

- `Loom`
- `Loom Dark`
- `Compact`
- `Hearth`

The theme system should make colors, spacing, sizing, radii, borders, elevation, widths, and motion configurable through shared tokens so new features inherit the active theme automatically without per-theme component logic.

## Why This Fits The Current Codebase

The current app structure is a strong base for this work:

- Global styling is already centralized in `client/styles/tokens.css`, `client/styles/design-system.css`, `client/styles/base.css`, `client/styles/layout.css`, and `client/styles/components.css`.
- The app already persists user preferences through `user_settings` and settings API routes.
- The root layout is server-rendered, which gives us a clean place to apply the active theme before paint.
- Mobile and desktop both depend on the same shared style layers, so a token-driven theme architecture can affect both consistently.

## Current-State Findings

### Good Foundations Already Present

- `public.user_settings` already contains a `theme text` column in the base migration.
- Shared CSS files already define a small token layer and shared component classes.
- The app already reads persisted settings server-side and sets cookies for preference-backed behavior.

### Main Gap To Close

The app still contains many hard-coded visual values:

- Direct hex colors in shared CSS
- Direct `font-size`, `padding`, `width`, `height`, and `border-radius` values
- Some inline component sizing

This means the key task is not "add a theme toggle". The key task is "finish the token architecture and migrate shared UI to consume it".

## Theme Model

### Recommended Settings Shape

Store one user preference in `user_settings.theme`, using a constrained enum-like string:

- `loom`
- `loom-dark`
- `compact`
- `hearth`

### Recommended Runtime Shape

Apply the theme at the document root with attributes on `<html>`:

- `data-theme="loom"`
- `data-theme="loom-dark"`
- `data-theme="compact"`
- `data-theme="hearth"`
- `data-color-mode="light|dark"`

`data-color-mode` should be independent because some behavior is better keyed to light vs dark than to a specific theme name.

## Theme Strategy

### 1. Semantic Tokens, Not Raw Tokens

Do not theme components by swapping raw values directly in many places. Create semantic tokens that express intent.

Examples:

- `--loom-bg-canvas`
- `--loom-bg-surface`
- `--loom-bg-surface-soft`
- `--loom-text-primary`
- `--loom-text-muted`
- `--loom-border-subtle`
- `--loom-border-strong`
- `--loom-accent-primary`
- `--loom-accent-primary-hover`
- `--loom-danger`
- `--loom-success`
- `--loom-shadow-card`
- `--loom-shadow-overlay`
- `--loom-radius-control`
- `--loom-radius-card`
- `--loom-control-height-sm`
- `--loom-control-height-md`
- `--loom-nav-item-height`
- `--loom-sidebar-width`
- `--loom-page-max-width`
- `--loom-space-1` through `--loom-space-8`
- `--loom-text-xs` through `--loom-text-2xl`
- `--loom-motion-fast`
- `--loom-motion-base`
- `--loom-motion-slow`
- `--loom-ease-standard`
- `--loom-ease-emphasized`

Components should consume these semantic tokens only.

### 2. Split Themes Into Two Layers

Use two levels of theme tokens:

#### Foundation tokens

Raw palette and physical scales:

- neutral colors
- accent colors
- spacing scale
- radius scale
- motion scale
- typography scale

#### Semantic tokens

Usage-based variables mapped from foundations:

- surface background
- text colors
- selected nav state
- input border
- card shadow
- badge colors

This keeps theme changes centralized and prevents feature code from encoding theme-specific rules.

## Proposed Themes

### Loom

Purpose:

- Keep the current product identity as the familiar default theme

Behavior:

- Existing visual direction
- Light surfaces
- Blue primary accent
- Current comfortable spacing and sizing

### Loom Dark

Purpose:

- Full dark interface without light flashes across common tasks

Behavior:

- Dark canvas and surfaces
- Slightly elevated card contrast
- Accent colors tuned for dark surfaces rather than reused unchanged
- Strong border and focus visibility

### Compact

Purpose:

- More professional and information-dense variant of Loom

Behavior:

- Smaller typography scale
- Tighter vertical rhythm
- Shorter controls
- Slightly narrower internal padding
- Equal or slightly stronger contrast so reduced size does not hurt readability

Important:

- Compact should still keep touch targets safe on mobile
- Compact should not simply apply browser-like zoom to the whole UI

### Hearth

Purpose:

- A warmer, calmer, less clinical theme optimized for a family-oriented productivity app

Rationale:

- Family-management apps benefit from trust, warmth, and clarity, not only efficiency
- A warmer neutral palette can make everyday coordination feel less administrative while preserving productivity
- This should be distinct from both standard light mode and compact mode

Behavior:

- Warm neutral backgrounds instead of cool gray-blue
- Slate text with softer contrast transitions
- Controlled sage/terracotta/gold accent usage for status and highlights
- Softer cards, more tactile surfaces, gentler separators
- Slightly more expressive hero surfaces and empty states
- Subtle fade and highlight motion rather than springy movement

Design intent:

- "Calm home operations" rather than "enterprise dashboard"

## Why `Hearth` Is The Recommended Fourth Theme

This recommendation is an inference from current design-system guidance and accessibility guidance, not a direct quote from a single source.

The strongest pattern from the research is:

- theme systems work best when based on tokens and root theme switching
- dark mode should be a true first-class theme
- color and motion need accessibility-safe defaults
- non-color themes are valid when they express different density or experience modes

For Loom specifically, the extra theme that adds the most value is not another technical variant. It is a more emotionally supportive visual language for a family app. `Hearth` is meant to fill that gap.

## Motion Strategy

Motion should also be tokenized. Do not bury transition values inside components.

Recommended motion tokens:

- `--loom-motion-fast`
- `--loom-motion-base`
- `--loom-motion-slow`
- `--loom-ease-standard`
- `--loom-ease-exit`
- `--loom-ease-emphasized`

Recommended animation uses:

- page-level fade and slight lift on major route content
- hover state fade for buttons and cards
- accordion and panel reveal using opacity and small height transitions
- notification badge state transitions using opacity and scale only if safe

Rules:

- avoid decorative parallax
- avoid large-scale zoom transitions
- avoid bright flashes on dark mode
- respect `prefers-reduced-motion`

## Performance Position

This architecture should have minimal runtime cost if implemented correctly.

### Low-risk choices

- Server-render the theme attribute at the root
- Use CSS custom properties for theme switching
- Keep theme selection out of component render logic
- Avoid generating dynamic style objects for large trees
- Avoid runtime theme recalculation inside feature components

### Higher-risk choices To Avoid

- deeply conditional JSX branches by theme
- many theme-specific className branches per component
- client-only theme initialization that causes flash-of-unstyled-theme
- animation-heavy background effects
- blur-heavy or transparency-heavy shells on low-end mobile

## Recommended File/Module Architecture

### New Or Restructured Style Files

- `client/styles/themes/foundation.css`
- `client/styles/themes/semantic.css`
- `client/styles/themes/loom.css`
- `client/styles/themes/loom-dark.css`
- `client/styles/themes/compact.css`
- `client/styles/themes/hearth.css`
- `client/styles/themes/motion.css`

Optional:

- `client/styles/themes/accessibility.css`

### New Theme Domain Files

- `client/lib/theme.ts`
- `client/lib/theme/server.ts`
- `client/features/theme/server.ts`
- `client/features/theme/theme-settings-form.tsx`

### API Surface

- `client/app/api/settings/theme/route.ts`

## Data Flow

### Server

1. Read theme from cookie.
2. If authenticated, hydrate from `user_settings.theme` when cookie is missing or stale.
3. Apply `data-theme` and `data-color-mode` in root layout before initial paint.

### Client

1. Settings form updates `/api/settings/theme`.
2. API writes cookie immediately.
3. API upserts `user_settings.theme` for authenticated users.
4. Client refreshes route state without remounting the entire app shell unnecessarily.

## Rollout Phases

### Phase 1. Theme Contract

- Define allowed theme values
- Add theme parsing and validation
- Add root theme application in server layout
- Add settings UI and API route
- Add cookie support

Deliverable:

- Theme can switch globally with no flash and persists per user

### Phase 2. Shared Tokens Migration

- Replace existing root token files with foundation plus semantic tokens
- Map existing Loom visuals into the new token contract
- Introduce dark, compact, and hearth token sets

Deliverable:

- Shared app shell and core primitives derive from theme tokens

### Phase 3. Shared Layout And Shell

- Migrate shell, sidebar, mobile tabs, cards, buttons, inputs, badges, avatars, headers, and common panels
- Remove hard-coded values from shared CSS
- Replace inline sizing in common shell components where practical

Deliverable:

- Mobile and desktop shell are theme-safe

### Phase 4. Feature Surface Sweep

- Audit feature-level CSS and inline styles
- Replace direct colors and sizing with semantic tokens
- Prioritize highest-traffic screens:
  - home
  - tasks
  - lists
  - calendar
  - messages
  - profile/settings

Deliverable:

- Main workflows feel coherent across all four themes

### Phase 5. Motion And Interaction Polish

- Apply tokenized transitions
- Add restrained route/content reveal patterns
- Add reduced-motion fallbacks
- Tune dark-mode interaction states and focus rings

Deliverable:

- Theme system feels intentional, not only recolored

### Phase 6. QA And Hardening

- Visual audit on desktop and mobile widths
- contrast checks for each theme
- reduced-motion audit
- screenshots for key screens
- regression pass for hover, active, disabled, selected, destructive, and empty states

Deliverable:

- Release-ready theme system

## Component Token Coverage Checklist

Every shared component family should be mapped to tokens for:

- page background
- surface background
- surface background hover
- text primary
- text secondary
- text inverse
- icon default
- icon muted
- icon inverse
- border default
- border strong
- input background
- input border
- input focus ring
- primary button background
- primary button hover
- ghost button background
- selected nav background
- selected nav text
- badge background
- badge text
- success state
- warning state
- danger state
- skeleton shimmer colors
- shadow/elevation
- radius values
- spacing values
- control heights
- typography scale
- motion values

## Mobile And Desktop Considerations

Themes must not assume desktop-only density.

### Mobile rules

- keep minimum touch target sizes safe
- compact theme may reduce visual padding without shrinking interactive hit areas below acceptable thresholds
- avoid dense text stacks in bottom navigation and drawers
- make dark theme notification badges and unread states more contrast-stable

### Desktop rules

- allow more compact layout rhythm
- support wider page shells as tokens, not one-off overrides
- preserve scannability in side navigation and data-heavy screens

## Accessibility Rules

- maintain accessible contrast targets for body text and critical controls
- never rely on color alone for status
- ensure focus styles remain strong in all themes
- support `prefers-reduced-motion`
- avoid bright flashes when switching into dark theme

## Suggested Order Of Execution In This Repo

1. Add theme parsing, typing, validation, cookie helpers, and server loader.
2. Add `/api/settings/theme`.
3. Add the theme control to the settings screen.
4. Apply `data-theme` and `data-color-mode` in `client/app/layout.tsx`.
5. Split and expand CSS token files into foundation plus semantic plus theme-specific layers.
6. Migrate shared shell styles first.
7. Migrate shared form controls and button styles.
8. Sweep top-priority feature screens.
9. Add motion tokens and reduced-motion handling.
10. Run visual QA across desktop and mobile.

## Risks

### Main risks

- incomplete migration leaves mixed old and new styling paths
- feature screens may keep hard-coded values that break dark or hearth themes
- compact mode can harm readability if spacing and contrast are reduced together
- dark mode can reveal low-contrast states that look acceptable in light mode

### Mitigations

- migrate shared primitives first
- enforce "semantic tokens only" for new styling work
- add a grep-based audit for direct hex values and direct radii/sizing in shared CSS
- validate the four themes on the highest-traffic routes before broad rollout

## Definition Of Done

The theme system is complete when:

- users can select one of the four themes in settings
- theme persists across sessions and devices
- theme applies before paint on server render
- shared shell and common controls are fully tokenized
- top-priority workflows render correctly on desktop and mobile for all four themes
- reduced motion and contrast expectations are met
- new feature work can rely on theme tokens without needing theme-specific code branches

## Research Notes

The plan above is informed by:

- Atlassian Design System guidance on design tokens, semantic theming, SSR theme application, and theme attributes on the root HTML element
- Apple accessibility guidance for dark interfaces, sufficient contrast, and reduced motion

Sources:

- https://atlassian.design/foundations/tokens/design-tokens/
- https://atlassian.design/tokens/use-tokens-in-code/
- https://atlassian.design/foundations/color
- https://developer.apple.com/help/app-store-connect/manage-app-accessibility/dark-interface-evaluation-criteria/
- https://developer.apple.com/help/app-store-connect/manage-app-accessibility/sufficient-contrast-evaluation-criteria/
- https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/
