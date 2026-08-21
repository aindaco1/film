# ADR 0059: Restore Pre-Restore Backup Proof

Date: 2026-07-08

## Status

Accepted

Updated by ADR 0061 and ADR 0066.

## Decision

The Worker restore commit dry-run gate must verify stored R2 pre-restore backup proof before it can advance past the backup-proof blocker. The proof is a D1 restore-point ID whose snapshot reference belongs to the same workspace and points at the `film-backups` R2 namespace.

The gate remains non-destructive. Missing or unverified proof returns `blocked_until_pre_restore_backup`; verified proof returns the existing `blocked_until_restore_commit_storage` status until durable restore commits are implemented.

## Context

Restore previews and confirmation gates reduce accidental overwrite risk, but a future destructive restore path also needs a current safety backup. Film already records stored R2 backup restore points in D1. Reusing that metadata for dry-run proof lets the UI and Worker practice the final safety flow without adding destructive writes.

## Consequences

- `/api/restores/commit-dry-run` accepts optional `preRestoreBackupId`.
- The Worker verifies the ID against D1 restore-point metadata for the same workspace and requires an R2 backup snapshot reference.
- The web app sends a pre-restore backup ID only when the current session has successfully stored backup bytes in R2.
- The restore gate inspector reports proof persistence, verification status, and blocker text.
- ADR 0061 adds durable approval dry-run records that reuse this proof model, and ADR 0066 requires the same proof before recording blocked commit-storage attempts.
