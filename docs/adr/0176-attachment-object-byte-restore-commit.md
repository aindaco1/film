# ADR 0176: Attachment Object Byte Restore Commit

## Status

Accepted.

## Decision

Restore attachment bytes through a separate owner/producer-only `PUT /api/restores/attachment-object-commit` route after the durable package preflight, package verification, object plan, and recent ready object commit preflight all match. The request must include the exact `RESTORE <workspaceId>` confirmation and the verified package, manifest, object, destination, size, content type, and SHA-256 metadata.

The browser reopens the downloaded ZIP, verifies every planned entry and SHA-256 locally, and uploads one object at a time. The Worker independently bounds and hashes the request body, refuses an existing D1 intent or R2 destination, uses an R2 create-only conditional put, and records both a `stored_r2` attachment intent and a destructive commit row. A metadata failure triggers best-effort cleanup of the newly written object and intent. A retry is idempotent only when the prior commit and current R2 metadata still match. ADR 0196 replaces the split D1 writes and best-effort-only cleanup with a durable prepared reservation, atomic D1 finalization, and recoverable compensation state.

## Context

Film already verified package manifests and destination absence, but stopped before byte submission. Completing the restore path required explicit streaming limits, overwrite policy, destination authorization, durable proof, compensation, and retry behavior.

## Consequences

- Attachment restore never overwrites an existing D1 or R2 destination.
- The browser and Worker both verify bytes; browser verification is not trusted as authorization.
- Each object is independently committed and auditable, so a partial package can be retried safely.
- The 25 MiB per-object bound keeps the current Worker path simple; larger objects require a future multipart design.
