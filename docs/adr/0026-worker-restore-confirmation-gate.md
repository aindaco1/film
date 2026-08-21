# ADR 0026: Worker Restore Confirmation Gate

Date: 2026-07-08

## Status

Accepted

Updated by ADR 0059, ADR 0061, and ADR 0066.

## Decision

Add a Worker-owned restore commit dry-run gate at `POST /api/restores/commit-dry-run` before any destructive restore endpoint exists.

## Context

Encrypted backup previews already show matching, new, and changed records plus field-level overwrite conflicts in the browser. That is enough for local inspection, but not enough for a real restore commit. A destructive restore needs server-side authorization and an explicit confirmation contract so future UI work cannot accidentally treat a preview as permission to overwrite data.

## Consequences

- The endpoint requires the same protected mutation auth as backup dry runs and is limited to owner or producer roles.
- Requests must include a valid workspace ID, a snapshot workspace ID that matches the target workspace, bounded restore preview counts, and the exact phrase `RESTORE <workspaceId>`.
- The response explicitly reports `destructiveWrite: false`, `preRestoreBackupRequired: true`, and a blocked commit status. ADR 0059 adds stored R2 pre-restore backup proof before the gate can advance from `blocked_until_pre_restore_backup` to `blocked_until_restore_commit_storage`.
- The gate does not write restored records, read backup contents, or move attachment bytes. ADR 0061 adds a separate durable approval dry-run endpoint, and ADR 0066 adds a blocked commit-storage attempt endpoint.
- A future destructive restore endpoint must still validate matching approval and commit-attempt records, rerun record-level conflict checks, write audit events, and provide rollback guidance.
