# 0054 Explicit R2 Backup Object Storage

## Status

Accepted

## Context

Film already exports encrypted `.filmbackup.zip` bundles in the browser and records latest-five restore-point metadata through a Worker dry-run route. That protects offline/local export, but restore-point metadata still used placeholder snapshot refs when the encrypted bytes were not stored in R2.

## Decision

Add a separate Worker-owned route, `PUT /api/backups/r2/upload-object`, for explicit storage of already-encrypted backup ZIP bytes in the `BACKUPS` R2 binding.

The route requires owner/producer mutation authorization when D1 auth is available, a valid workspace, matching workspace scope, `STORE BACKUP <workspaceId>` confirmation, a valid backup timestamp, declared size under the upload cap, a declared SHA-256 hash, and a matching SHA-256 over the received bytes. The Worker derives the R2 object key from workspace ID, backup timestamp, and hash; the browser does not choose the path.

After a successful R2 write, the Worker records a restore-point row whose snapshot ref points at `r2://film-backups/...`, prunes older restore points to latest five, and writes an audit event when D1 is available.

The web backup button still downloads the encrypted ZIP locally first. It then attempts the explicit R2 upload and falls back to the metadata-only backup dry-run route if storage is unavailable.

## Consequences

- Backup object storage no longer relies on placeholder snapshot refs when the `BACKUPS` binding is available.
- Passphrases and decrypted workspace payloads remain browser-only; the Worker receives only encrypted ZIP bytes plus validation metadata.
- Local backup export remains usable offline or when the Worker rejects storage.
- ADR 0055 adds protected stored-backup manifest and object download. Restore application from R2, lifecycle policy, and destructive restore commits remain future work.
