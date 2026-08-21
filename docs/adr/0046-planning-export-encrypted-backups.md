# ADR 0046: Planning Export In Encrypted Backups

Date: 2026-07-08

## Status

Accepted

## Decision

Add a Worker-owned `POST /api/planning/export/dry-run` route that exports bounded D1 production-planning rows for inclusion inside encrypted browser ZIP backups.

## Context

Notion production-planning imports now have a D1 commit path. That creates durable user data outside the current browser workspace model, so backups need a read/export boundary before deeper integrations make those rows more important.

## Consequences

- The route requires owner or producer authorization when D1 auth storage is available.
- Export requests are capped at 1,000 planning records and share the backup/restore rate-limit bucket.
- The browser backup flow calls the planning export route before encrypting the ZIP snapshot.
- Planning rows are included inside the encrypted snapshot payload, not as plaintext ZIP entries.
- The plaintext ZIP manifest exposes only planning row count, truncation status, and persistence mode.
- If the Worker or D1 export is unavailable, the local encrypted backup still completes and the UI reports that planning rows were not included.
- ADR 0074 added per-table planning restore previews, and ADR 0082 added gated planning restore commits for these rows.
