# Loom Initial Feature Plan (Design -> Implementation -> Testing)

## Scope baseline extracted from requirements
- Hybrid model: private per-user planning + shared household collaboration.
- Space model retained, but extended to support resource visibility scopes.
- Initial feature set to build next:
  - Board/list containers (family shared + personal private + selected-member sharing)
  - Sections and tasks
  - Assignments
  - Checklist items
  - Comments and mentions
  - Reminders (one-time + recurrence fields)
  - Shared grocery list behavior (board kind)
  - Notifications and activity log foundations
- Explicitly out of scope for now:
  - Billing/pricing
  - External integrations (calendar providers, WhatsApp, Zapier, ChatGPT)
  - Native voice/Smart Type NLP engine implementation (only schema hooks + UX placeholders)

## Stage 1 - Design
### Activities
1. Domain model decision
- Keep `spaces` as top-level household container.
- Add `boards` with `access_scope` (`private`, `space`, `selected`) to support mixed visibility.
- Add board and task collaboration entities.

2. Permission matrix definition
- Access by identity + ownership + space membership + board sharing.
- Admin override from space-level role.
- Board-level roles (`admin`, `member`, `viewer`) for future fine control.

3. Database design and migration drafting
- Produce one SQL file for all schema, constraints, triggers, helper functions, and RLS.
- Include enforcement for:
  - max 4 members per space
  - max 4 non-private boards per space

4. UX information architecture pass
- Left rail (views + spaces), center workflow stream, right utility rail.
- Flows to support: create board/list, create task, invite member, assign task, comment.

### Deliverables
- SQL migration blueprint:
  - `.reqs/db/20260307_loom_initial_feature_schema.sql`
- This execution plan document.

### Estimate
- Time: 8-12 hours
- Token consumption: 80k-130k

## Stage 2 - Implementation
### Activities
1. Database layer rollout
- Apply SQL migration file.
- Validate functions, RLS policies, and constraints with real users.

2. Server/data access layer updates
- Add typed query modules for boards, sections, tasks, assignments, comments, reminders.
- Add RPC wrappers where atomic actions are required.

3. Core feature implementation
- Board/list create/edit flows (space/private/selected visibility)
- Section and task CRUD
- Assignment and checklist item assignment
- Comment and mention creation
- Reminder create/update with recurrence fields
- Grocery board mode behavior for item UX

4. Navigation and UI cohesion
- Keep new 3-zone shell and align all new features into it.
- Add empty states, error states, and optimistic feedback where safe.

5. Security hardening
- Verify all write operations remain enforced by RLS and not only frontend checks.

### Deliverables
- Functional initial feature set in app.
- Updated migrations and docs.

### Estimate
- Time: 28-40 hours
- Token consumption: 240k-420k

## Stage 3 - Testing
### Activities
1. Database/RLS validation
- Test matrix for owner/member/non-member/admin access.
- Test scope rules (`private`, `space`, `selected`).
- Test membership and board cap constraints.

2. Integration testing
- Auth -> board access -> task operations end-to-end.
- Invite flow -> login -> access propagation.

3. UX and regression testing
- Desktop + smartphone behavior.
- Navigation continuity across dashboard/admin/new board/task flows.

4. Failure-mode testing
- Duplicate invites, unauthorized writes, deleted memberships, stale sessions.

### Deliverables
- Test run report and remediation fixes.

### Estimate
- Time: 10-16 hours
- Token consumption: 90k-160k

## Combined estimate
- Total time: 46-68 hours
- Total token consumption: 410k-710k

## Execution order after approval
1. Apply SQL file in Supabase SQL Editor.
2. Confirm schema + policy creation succeeded.
3. Start implementation stage in iterative batches:
- Batch A: boards + visibility
- Batch B: sections/tasks/assignments
- Batch C: comments/mentions/reminders
- Batch D: grocery mode + notifications/activity
4. Run full testing stage.
