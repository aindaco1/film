# ADR 0197: Recoverable R2 Metadata Finalization

Date: 2026-07-09

## Status

Accepted

## Decision

Treat encrypted backup uploads and normal attachment uploads as incomplete until their required D1 metadata and audit evidence finalize successfully.

Backup uploads now require both D1 and R2. The Worker reads the declared body through the bounded streaming helper, verifies SHA-256, derives a deterministic object key and restore-point ID, and uses a create-only R2 put. An exact existing R2 object is a recoverable retry; a metadata mismatch is a conflict. Restore-point insertion, latest-five retention, and deterministic audit evidence execute in one D1 batch. If that batch fails, the encrypted object remains at its deterministic key and the route returns `r2_backup_metadata_pending` with 503 so the same upload can finalize metadata without a second R2 write.

Normal attachment storage reuses the existing prepared upload intent as its reservation. The Worker uses bounded body reads, the intent's content type, create-only R2 puts, and exact R2 metadata checks. Intent finalization and deterministic audit evidence execute in one D1 batch. A batch failure returns `r2_attachment_metadata_pending`; the prepared intent and matching R2 object remain recoverable by the same token-bound request without overwrite or a second upload.

## Context

Both paths previously wrote R2 before separate D1 calls. Backup metadata failure still returned success and could leave an object absent from restore-point manifests. Attachment metadata failure also returned an accepted object while its intent remained prepared. Both routes used unbounded `request.arrayBuffer()` reads, and normal attachment storage did not use a no-overwrite conditional put.

## Consequences

- R2 byte persistence is no longer reported as fully committed before D1 evidence is durable.
- Deterministic exact-state retries recover cross-store failures without duplicate object writes.
- Existing destination objects with mismatched ownership/hash metadata remain blocked.
- Request bodies cannot exceed their declared size or route-specific cap while being buffered.
