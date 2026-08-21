# ADR 0164: Expiring Stored Backup Download Plans

## Status

Accepted

## Decision

Add `POST /api/backups/r2/object-download-plan` plus the `backup_object_download_plans` D1 table.

Stored backup byte downloads now require a short-lived plan ID and token. The plan route requires owner/producer auth, CSRF/session validation when D1 auth storage is available, workspace scope checks, a D1 restore-point ID, the `BACKUPS` R2 binding, a derived workspace-scoped backup object key, and an existing R2 object. It stores only a hashed token, object key, restore point, actor member, and 15-minute expiry, then records bounded audit metadata with `destructiveWrite: false`.

`GET /api/backups/r2/object` rejects direct downloads without a matching plan ID and token. It verifies token hash, expiry, restore-point match, object-key match, and workspace object-key prefix before reading encrypted backup bytes from R2. The browser preview flow creates the plan immediately before downloading, then decrypts the backup locally.

## Context

Stored backup downloads already resolved D1 restore-point IDs server-side instead of trusting browser-supplied R2 keys. That prevented arbitrary bucket-key reads, but it did not provide a short-lived, auditable byte-download grant.

Backups are encrypted before upload, but downloaded backup bytes still deserve explicit expiry and replay resistance because they contain the encrypted workspace, document-body payloads, planning exports, and attachment restore-policy metadata.

## Consequences

- Direct stored-backup byte downloads are blocked unless an unexpired D1-backed plan exists.
- The browser never receives or supplies a raw R2 object key for stored-backup preview.
- Operators get an audit event for plan creation and a separate audit event for download.
- Download plans are not destructive and do not weaken the existing local-only passphrase/decryption boundary.
