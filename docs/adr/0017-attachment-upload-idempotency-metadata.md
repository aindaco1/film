# ADR 0017: Attachment Upload Idempotency Metadata

Date: 2026-07-08

## Status

Accepted

## Decision

Persist attachment upload prepare/commit metadata in D1 when the `DB` binding and migration are available. The Worker records deterministic upload intent IDs, scoped object keys, size/content-type/SHA-256 metadata, expiry, and commit status. Commit tokens are returned to the browser for the dry-run handshake, but D1 stores only their SHA-256 hashes.

If D1 is absent or unavailable in local dry-run development, the Worker keeps the existing memoryless dry-run behavior and reports that persistence mode in the response.

## Context

The previous R2 prepare/commit dry-run modeled the browser-to-R2 upload flow but did not record intent state. That meant repeated commits could not be distinguished from first commits once live D1 was available, and future signed upload work had no durable metadata contract.

Film still does not have production R2 signing, object lifecycle rules, or byte-level restore/export policy. The next conservative step is durable metadata and idempotency, not live binary storage.

## Consequences

- `migrations/0003_attachment_upload_intents.sql` adds the D1/SQLite table for upload intents and commit status.
- `/api/attachments/r2/prepare-upload` returns an `idempotencyKey` and records the intent when D1 is working.
- `/api/attachments/r2/commit` rejects commits that have no prepared D1 intent when D1 is working, and returns the original commit timestamp for repeated commits.
- Local development without applied D1 migrations can still use the Notion importer through dry-run fallback, but the response exposes that persistence was not durable.
- Attachment bytes remain in browser IndexedDB or future direct R2 uploads; they are not sent to the Worker and are not included in workspace JSON, operation payloads, or encrypted backups.
