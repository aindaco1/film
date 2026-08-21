# ADR 0119: Planning Workspace Section

Date: 2026-07-08

## Status

Accepted

## Decision

Promote Planning from a static sidebar label into a real workspace section in the static app shell.

The section:

- uses the existing `Slate` dashboard as the default section,
- adds a `Planning` workspace section with a full-width read-only planning table,
- reuses local import operation samples by default,
- can refresh a bounded read-only D1 planning export through the existing protected Worker dry-run,
- keeps unsupported sidebar items on the existing dry-run toast until their own sections are implemented.

## Context

ADR 0118 made planning rows visible inside the Slate dashboard, but the sidebar already exposed `Planning` as a workspace destination. Leaving that item inert made the app feel less operational and hid the most useful planning row review behind the dashboard footer.

## Consequences

- Planning now has a first-class place in the workspace without introducing client-side planning persistence or CRUD.
- The static app shell gets a small validated section state instead of a framework/router dependency.
- Future sections can follow the same conservative pattern: promote one sidebar item at a time only when it has a useful operational surface.
