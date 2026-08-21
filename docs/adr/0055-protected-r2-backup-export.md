# 0055 Protected R2 Backup Export

## Status

Accepted

## Context

ADR 0054 stores already-encrypted backup ZIP bytes in the `BACKUPS` R2 bucket and records D1 restore points whose snapshot refs point at those objects. The next boundary is read access: users need to discover stored backup objects and eventually restore from them, but browser code must not list R2 buckets or choose arbitrary object keys.

## Decision

Add two Worker-owned routes:

- `POST /api/backups/r2/export-manifest` returns a bounded manifest of D1 restore points whose snapshot refs point at `r2://film-backups/workspaces/<workspace>/backups/...`.
- `GET /api/backups/r2/object` returns one encrypted backup ZIP only after the Worker validates owner/producer authorization, workspace scope, a D1 restore-point ID, the snapshot ref namespace, and the derived R2 object key prefix.

The browser-facing UI starts with a `Stored backups` action that previews the bounded manifest count and a `Preview stored backup` action that downloads a selected encrypted ZIP through the Worker, prompts for the passphrase locally, and reuses the existing non-destructive restore preview.

## Consequences

- R2 backup reads are mediated by D1 restore-point ownership, not browser-supplied object keys.
- Dry-run restore points with placeholder snapshot refs are not exposed as stored backup objects.
- The Worker can audit manifest creation and backup object downloads when D1 is available.
- Restore application from downloaded backup bytes remains non-destructive and preview-only until durable restore commits are implemented.
