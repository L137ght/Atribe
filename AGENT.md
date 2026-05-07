# AGENT.md

## Purpose

This file defines mandatory behavior for AI agents, coding agents, and contributors working on Atribe.

Atribe uses two root documentation files as active source-of-truth companions to the codebase:

- `IMPLEMENTATION.md` — what the app currently does, where it is implemented, and what runtime/data sources are authoritative.
- `FLOW.md` — how users move through the app, which roles/screens/paths exist, and how frontend, backend, extension, Shopify, and Supabase flows connect.

Whenever application scope expands, agents must update these files in the same change set as the code or product change.

## Non-Negotiable Rule

If a task adds, removes, renames, or materially changes any app capability, user role, screen, navigation path, backend endpoint, data model, integration, attribution behavior, auth behavior, deployment surface, or runtime subsystem, the agent must update both:

1. `IMPLEMENTATION.md`
2. `FLOW.md`

Do not leave these files stale.

A change is not complete until the documentation reflects the new implemented reality.

## Scope Expansion Definition

Treat the application scope as expanded when any of the following happen.

### Product or UX scope expands

Update both source-of-truth files when adding or changing:

- a new user role
- a new onboarding step
- a new screen
- a new tab, drawer item, route, or navigation destination
- a new dashboard section
- a new creator/supporter/brand workflow
- a new empty state, fallback state, or error-recovery flow
- a new CTA that changes what a user can do
- a new mobile, web, extension, or embedded app surface

### Backend scope expands

Update both source-of-truth files when adding or changing:

- an API route
- a controller
- a service
- a repository
- middleware
- auth/session handling
- redirect behavior
- attribution behavior
- webhook handling
- commission or payout logic
- reporting endpoints
- provider-specific behavior such as Supabase vs SQLite

### Data scope expands

Update both source-of-truth files when adding or changing:

- Supabase tables
- SQLite tables
- migrations
- RLS policies
- storage buckets
- analytics/event tables
- new read/write paths
- data ownership assumptions
- snapshots, ledgers, attribution records, or routing-event records

### Integration scope expands

Update both source-of-truth files when adding or changing:

- Shopify integration behavior
- affiliate-program integrations
- Amazon or external marketplace routing
- browser extension behavior
- webview/deep-link behavior
- OAuth providers
- payment providers
- deployment domains or subdomains
- third-party APIs

### Architecture scope expands

Update both source-of-truth files when adding or changing:

- app packages
- services
- shared packages
- runtime boundaries
- source-of-truth hierarchy
- environment variables that affect runtime behavior
- hosting/deployment responsibilities
- local/dev/prod differences

## Required Documentation Behavior

### `IMPLEMENTATION.md` must answer

When code or product scope changes, update `IMPLEMENTATION.md` so it clearly states:

- what exists now
- where it is implemented
- which files own the behavior
- which runtime path is active
- which database tables are read from or written to
- which endpoints are used
- which surfaces are incomplete, placeholder-only, mockup-only, or deprecated
- any contradiction between runtime code, README claims, design files, and intended product direction

Use concrete file paths. Prefer this format:

```md
- Implemented in: `path/to/file.js`
- Reads: `table_name`
- Writes: `table_name`
- Used by: `path/to/caller.js`
- Not currently used by: `path/to/screen.js`
```

### `FLOW.md` must answer

When code or product scope changes, update `FLOW.md` so it clearly states:

- which user role is affected
- which screen or route changed
- how the user enters the flow
- what the user can do next
- which backend/Supabase calls happen during the flow
- what data is read or written
- what is still missing or contradictory
- how the change affects supporter, creator, brand, extension, Shopify, or admin journeys

Document current implemented behavior, not aspirational behavior.

## Documentation Timing

Agents must update `IMPLEMENTATION.md` and `FLOW.md` during the same task whenever scope expands.

Do not wait for a separate documentation task.
Do not create code-only scope expansions.
Do not rely on a later agent to reconcile source-of-truth files.

## Required Agent Workflow

Before editing code, inspect the relevant source-of-truth files:

1. Read `IMPLEMENTATION.md`.
2. Read `FLOW.md`.
3. Identify whether the requested change expands app scope.
4. If scope expands, plan the required documentation edits before making the code change.

After editing code, verify:

1. The implementation files changed as intended.
2. `IMPLEMENTATION.md` reflects the new runtime behavior.
3. `FLOW.md` reflects the new user journey or system flow.
4. Any old claims contradicted by the new change were removed or marked as stale/incomplete.
5. File paths, endpoint names, table names, and screen names are accurate.

## Completion Checklist

For every task, the agent must explicitly check:

```md
- [ ] Did this change expand app scope?
- [ ] If yes, did I update `IMPLEMENTATION.md`?
- [ ] If yes, did I update `FLOW.md`?
- [ ] Did I document actual implemented behavior instead of intended behavior?
- [ ] Did I include concrete file paths for new or changed behavior?
- [ ] Did I document reads/writes for any new or changed data flow?
- [ ] Did I document endpoints for any new or changed backend flow?
- [ ] Did I mark incomplete, mockup-only, placeholder, or deprecated surfaces honestly?
```

If the answer to the first question is yes and either documentation file was not updated, the task is incomplete.

## Definition of Done

A scope-expanding task is done only when all of the following are true:

1. The code change is complete.
2. `IMPLEMENTATION.md` describes the new implementation reality.
3. `FLOW.md` describes the new user/system flow reality.
4. The docs do not claim unimplemented features are live.
5. The docs do not hide contradictions or partial integrations.
6. The docs include exact paths for the relevant files.
7. The docs preserve the existing source-of-truth hierarchy:

```text
Runtime truth > database truth > README truth > design/mockup truth
```

## Handling Unclear Scope

If it is unclear whether a change expands scope, assume that it does.

Examples:

- Renaming a button without changing behavior usually does not expand scope.
- Adding a new CTA destination expands scope.
- Refactoring a function internally usually does not expand scope.
- Moving behavior into a new service may expand architecture scope.
- Adding a new environment variable that changes runtime behavior expands architecture scope.
- Adding a new table, column, or migration expands data scope.
- Adding a new screen, even if simple, expands product scope.

When in doubt, update both files.

## Documentation Style Rules

- Be factual.
- Be specific.
- Do not describe future plans as current behavior.
- Do not inflate maturity.
- Do not remove known contradictions unless the code actually resolves them.
- Prefer concise bullets over long prose.
- Use exact filenames, endpoints, table names, and route names.
- Keep implementation details in `IMPLEMENTATION.md`.
- Keep user/system journey details in `FLOW.md`.
- Cross-reference the other file only when helpful.

## Common Required Updates

### When adding a screen

Update `IMPLEMENTATION.md` with:

- screen file path
- role ownership
- state/context dependencies
- backend/Supabase dependencies
- whether it is active in navigation

Update `FLOW.md` with:

- screen name
- entry path
- exit actions
- user role
- data reads/writes
- backend calls
- UX issues or missing integration

### When adding an endpoint

Update `IMPLEMENTATION.md` with:

- route
- controller/service/repository files
- reads/writes
- auth requirements
- caller surface if any

Update `FLOW.md` with:

- which user/system flow calls it
- when it is called
- what changes for the user or system
- missing frontend integration if no UI calls it yet

### When adding a database table or migration

Update `IMPLEMENTATION.md` with:

- migration file
- table name
- owning subsystem
- read/write paths
- RLS/security assumptions if applicable

Update `FLOW.md` with:

- which flow depends on the table
- which actions create, read, update, or delete rows
- whether the data is user-facing, internal, analytics-only, or attribution-only

### When changing attribution/routing

Update `IMPLEMENTATION.md` with:

- redirect route behavior
- attribution params
- snapshot/ledger behavior
- cookie/localStorage/script behavior
- backend service paths
- affected tables

Update `FLOW.md` with:

- supporter routing flow
- creator attribution impact
- brand/order impact
- extension or mobile impact
- unsupported-domain behavior

### When changing auth or roles

Update `IMPLEMENTATION.md` with:

- auth provider
- auth state source
- role storage
- guards/middleware
- dev bypasses
- ownership checks

Update `FLOW.md` with:

- onboarding path
- post-login routing
- role-specific destinations
- missing or weak auth checks

## Anti-Patterns

Agents must not:

- change app scope without updating the source-of-truth files
- document intended behavior as implemented behavior
- rely on design mockups as runtime authority
- remove warnings about incomplete surfaces unless code proves they are complete
- create new flows without placing them in the navigation map
- add backend routes without documenting who calls them
- add tables without documenting their read/write paths
- leave `IMPLEMENTATION.md` and `FLOW.md` disagreeing with each other

## Agent Instruction Summary

Every time Atribe gets bigger, update the map.

The map is:

- `IMPLEMENTATION.md` for implementation reality
- `FLOW.md` for journey reality

Code, docs, and flow must evolve together.
