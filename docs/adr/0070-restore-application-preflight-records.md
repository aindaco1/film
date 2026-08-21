# ADR 0070: Restore Application Preflight Records

Date: 2026-07-08

## Status

Accepted

## Decision

Add durable, non-destructive restore application preflight records at `POST /api/restores/application-dry-run`.

The route requires owner/producer authorization, matching workspace IDs, bounded preview counts, the exact `RESTORE <workspaceId>` confirmation phrase, D1 approval and commit-attempt storage, a verified stored R2 pre-restore backup proof, an existing `approved_pending_commit` approval row, and an existing `blocked_until_restore_apply` commit attempt. The request preview, snapshot workspace, backup timestamp, and pre-restore backup ID must match both stored records before the Worker writes a `restore_application_preflights` row.

Application preflights have one status for now: `blocked_until_restore_apply_implementation`. They persist rollback guidance, bounded non-authoritative table-plan metadata, preview JSON, proof IDs, actor member ID, and `destructive_write = 0`.

## Context

Film now has a restore preview, confirmation gate, pre-restore backup proof, approval record, and commit-storage attempt. The next conservative step is to prove the final pre-application contract and rollback metadata without mutating any Film records.

## Consequences

- `migrations/0010_restore_application_preflights.sql` adds the `restore_application_preflights` table.
- The web inspector shows `Check application preflight` after a blocked commit-storage attempt exists.
- The route returns `destructiveWrite: false` and `commitStatus: blocked_until_restore_apply_implementation`.
- The route validates table-plan metadata for row count, table names, entity types, count consistency, restore support, and bounded blockers before storing it in rollback guidance.
- The route records a D1 audit event when D1 auth/session storage is available.
- Future destructive restore application must still rerun conflict checks, apply rows per table, write per-table audit events, and use the stored pre-restore backup for rollback.
