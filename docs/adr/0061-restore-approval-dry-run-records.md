# ADR 0061: Restore Approval Dry-Run Records

Date: 2026-07-08

## Status

Accepted

Updated by ADR 0066.

## Decision

Add durable, non-destructive restore approval records at `POST /api/restores/approval-dry-run`.

The route uses the same owner/producer authorization, workspace match, bounded preview counts, exact `RESTORE <workspaceId>` confirmation phrase, and stored R2 pre-restore backup proof model as the restore commit dry-run gate. When D1 is available, it writes a `restore_approvals` row with the authenticated actor, snapshot workspace, backup timestamp, pre-restore backup proof ID, preview JSON, approval status, and `destructive_write = 0`.

Statuses are intentionally narrow:

- `blocked`: approval intent was recorded, but verified pre-restore backup proof is missing.
- `approved_pending_commit`: approval intent has verified pre-restore backup proof, but restore application is still absent.

## Context

The restore gate already practices authorization and confirmation, but future destructive restore work needs a durable marker that an owner or producer intentionally reviewed a specific preview. Persisting that marker now lets the UI and Worker exercise the approval handoff while keeping actual restore commits blocked.

## Consequences

- `migrations/0007_restore_approvals.sql` adds the `restore_approvals` table.
- The web inspector shows `Record approval` after a restore preview and gate check.
- Approval records persist only preview counts and warnings, not decrypted backup contents or backup passphrases.
- The route always returns `destructiveWrite: false`.
- ADR 0066 adds a commit-storage dry-run route that validates a matching approved record and records a blocked commit attempt before any destructive restore application exists.
- Future destructive restore commits must validate matching approval and attempt records, rerun conflict checks, write audit events, and define rollback guidance before applying data.
