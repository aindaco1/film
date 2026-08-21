# ADR 0062: Expiring Attachment Package Plans

Date: 2026-07-08

## Status

Accepted

## Decision

Require an expiring D1-backed package plan before stored R2 attachment ZIP downloads.

`POST /api/attachments/r2/export-package-dry-run` can bind a package plan to selected D1-confirmed object keys. When the package is streamable, the Worker writes an `attachment_package_plans` row with the workspace, actor, selected object keys, object count, total source bytes, token hash, and expiry. It returns the package plan ID, one-time browser-visible package token, and expiry to the signed-in browser response.

`POST /api/attachments/r2/package` now requires the matching package plan ID and package token, rejects expired plans, rejects selected-key mismatches, revalidates every object key against D1, and checks that the total source byte count still matches the plan before reading R2 bytes.

## Context

The package ZIP route already revalidated browser-submitted object keys against D1 and enforced the byte cap. It still allowed callers to skip the package planning step and call the ZIP route directly. A short-lived plan token makes the protected package flow explicit: manifest, plan, then download.

## Consequences

- `migrations/0008_attachment_package_plans.sql` adds package plan storage.
- Package tokens are hashed at rest and expire after 15 minutes.
- Package downloads remain protected by owner/producer auth, CSRF/session checks, workspace scope, D1 object validation, R2 object validation, package SHA-256 headers, and the 25 MB source-byte cap.
- Browser state stores the returned plan token only long enough to download the planned package.
- Object-download expiry policy remains future hardening work. ADR 0063 adds bounded single-range support for protected individual attachment object downloads, and ADR 0064 adds bounded single-range support for protected package ZIP downloads.
