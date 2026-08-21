# ADR 0074: Restore Planning Dry-Run Previews

Date: 2026-07-08

## Status

Accepted

## Decision

Add `POST /api/restores/planning-dry-run` as a Worker-owned, preview-only restore check for D1 production-planning rows carried inside encrypted backups.

The route accepts backup planning records after a browser has decrypted a backup locally. It requires owner/producer authorization when D1 auth is available, rejects snapshot workspace mismatches, validates bounded planning record payloads, compares accepted rows with existing D1 planning tables, and classifies each row as `createPreview`, `idempotent`, or `updatePreview`. Rejected rows are reported with bounded reasons. When D1 is available, the route stores a `restore_planning_previews` row with count-level metadata, table summaries, rejected indexes/reasons, and update field keys. It records an audit event when D1 audit storage is available and never writes restored planning rows.

## Context

Encrypted backups already include D1 planning export records, and restore previews can show per-kind and per-table coverage. Operators still need a Worker-side check against current D1 state before committing planning restores. This gives the UI a server-owned preflight without introducing destructive restore behavior. ADR 0082 later adds the gated planning commit endpoint.

## Consequences

- Backup planning rows remain in browser memory after decryption and are not persisted locally as restored data.
- The web UI exposes `Check planning restore` when a preview includes planning rows.
- The Worker returns per-table create/idempotent/update/rejected counts and bounded field-level update-preview details.
- D1 stores durable restore planning preview proof without current/incoming field values.
- Invalid backup planning records produce preview rejections instead of partial writes.
- Future work still needs explicit per-table restore commit endpoints, conflict rechecks from trusted backup contents, and audited D1 create/update writes.
