# ADR 0113: Core Record Mutation Preflight

Date: 2026-07-08

## Status

Accepted.

## Context

Core record ownership, transfer history, explicit record permissions, and comment intents now exist, but update/delete collaboration policy still needed a safe path before any destructive browser workflow ships.

## Decision

Add a non-destructive Worker route, `POST /api/records/mutations/preflight`, for project, task, document, person, equipment, and expense rows.

The route requires authenticated CSRF/session metadata, workspace scope, a fixed core entity type, an existing core row, and a fixed mutation kind of `update` or `delete`. Owner and producer sessions can preflight update or delete access. Other roles can preflight update access for project, task, document, and equipment rows when they own the row or hold an unexpired exact `write` or `admin` grant. Person and expense update preflights remain operator-only for now. Delete preflight remains owner/producer-only for all core rows.

The route does not mutate records. When allowed, it returns only policy metadata: selected entity, mutation kind, allowed-by reason, persistence mode, and audit persistence. Successful preflights record bounded audit metadata.

## Consequences

- The UI can expose update/delete policy checks without introducing destructive actions.
- Explicit write/admin grants can be validated against future update workflows.
- Delete behavior stays conservative until undo, backup, retention, and restore semantics are explicit.
- Actual update/delete routes, optimistic local editing, and permission history remain future work.
