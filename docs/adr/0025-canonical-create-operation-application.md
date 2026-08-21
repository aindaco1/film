# ADR 0025: Canonical Create Operation Application

Date: 2026-07-08

## Status

Accepted

## Decision

When D1 operation replay is available, apply validated and authorized `project.created`, `task.created`, and `document.created` operations to canonical D1 tables in addition to recording operation metadata.

## Context

Operation-log replay proved idempotency and conflict checks, but the server still did not materialize user-created records. The safest next step is a narrow create-only application path for the three browser actions with bounded, known payloads. Backup, restore, import, workspace seed, update, delete, and provider operations need stronger commit semantics before canonical mutation.

## Consequences

- `project.created` inserts `projects` and a default `film_profiles` row.
- `task.created` inserts `tasks`; if the referenced project is a known seed project, the Worker materializes that project first so the relation is preserved.
- `document.created` inserts `documents` with a canonical document type derived from the local draft type.
- The sync response reports `canonicalApplied` and `metadataOnly` operation IDs.
- Replayed duplicate operation IDs remain idempotent and do not reapply canonical rows.
- Unsupported operation kinds continue to be recorded as metadata-only.
- This still depends on operation-kind role checks. Later ADRs add scoped replay guards and owner metadata; updates, deletes, restore commits, import commits, ownership transfer, and provider-side mutation remain future work.
