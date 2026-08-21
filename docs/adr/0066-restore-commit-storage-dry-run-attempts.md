# ADR 0066: Restore Commit Storage Dry-Run Attempts

Date: 2026-07-08

## Status

Accepted

## Decision

Add durable, non-destructive restore commit storage attempts at `POST /api/restores/commit-storage-dry-run`.

The route requires owner/producer authorization, matching workspace IDs, bounded preview counts, the exact `RESTORE <workspaceId>` confirmation phrase, D1 approval storage, a verified stored R2 pre-restore backup proof, and an existing `restore_approvals` row with `approved_pending_commit` status and `destructive_write = 0`. The request preview, snapshot workspace, backup timestamp, and pre-restore backup ID must match the approval record before the Worker writes a `restore_commit_attempts` row.

Commit attempts have one status for now: `blocked_until_restore_apply`. They prove the approval handoff reached durable storage while keeping restore application disabled.

## Context

Film now has a restore preview, confirmation gate, pre-restore backup proof, and approval record. The next safe step is not to apply restored records, but to persist the final pre-application validation attempt so the future destructive restore endpoint has an explicit handoff contract to validate.

## Consequences

- `migrations/0009_restore_commit_attempts.sql` adds the `restore_commit_attempts` table.
- The web inspector shows `Check commit storage` after an approved pending-commit approval.
- The route returns `destructiveWrite: false` and `commitStatus: blocked_until_restore_apply`.
- Attempts persist only preview counts and warnings, approval metadata, proof ID, actor member ID, status, and timestamps.
- ADR 0070 adds a blocked application-preflight record with rollback guidance. Future restore application still needs per-table apply logic, conflict rechecks, and audited writes before destructive changes are allowed.
