# 0082 - Planning Restore Commits

## Status

Accepted.

## Context

Encrypted backups can include D1 production-planning rows, and `POST /api/restores/planning-dry-run` can classify those rows as create, idempotent, update-preview, or rejected without writing restored data. Operators still need a Worker-owned destructive path for planning rows, but it must not bypass restore approval, pre-restore backup proof, or stale-preview checks.

## Decision

Add `POST /api/restores/planning-commit` for first-class D1 planning tables: locations, opportunities, meeting notes, equipment requests, shows, merch items, media items, and production roles.

The endpoint requires owner/producer auth, CSRF/session validation, exact `RESTORE <workspaceId>` confirmation, a matching approved restore approval, matching blocked commit attempt, matching blocked application preflight, verified stored R2 pre-restore backup proof, a matching durable `restore_planning_previews` row, bounded planning records, zero rejected records, and a fresh preview recheck that matches the stored planning preview counts/table summaries. Successful commits upsert only planning rows and write `restore_planning_commits` with `destructive_write = 1`.

## Consequences

- Planning rows now have a real destructive restore path separate from the workspace snapshot commit endpoint.
- Stale planning previews are rejected before any planning rows are written.
- Attachment bytes remain separate restore work.
- The web client exposes planning apply only after planning preview and application preflight, and the preview panel now includes a scrollable row-by-row review table before apply.
