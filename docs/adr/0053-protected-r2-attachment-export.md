# 0053 Protected R2 Attachment Export

## Status

Accepted

Updated by ADR 0062, ADR 0063, ADR 0064, and ADR 0065.

## Context

Film now has an explicit attachment byte-storage action that can write staged Notion attachment blobs to the `ATTACHMENTS` R2 binding after D1 upload intent validation. Once bytes are stored, users need a way to prove what is exportable and eventually retrieve those bytes, but the browser must not gain broad R2 listing authority or decide which object belongs to a workspace.

## Decision

Stored attachment export uses Worker-owned endpoints:

- `POST /api/attachments/r2/export-manifest` returns a bounded manifest of D1 `stored_r2` attachment intent rows for the authenticated workspace.
- `POST /api/attachments/r2/export-package-dry-run` returns a package plan with object count, total size, byte-source status, expiring package token metadata, and blockers when D1/R2 metadata is unavailable, truncated, or over the package byte cap.
- `GET` or `POST /api/attachments/r2/package` returns a bounded ZIP package containing a manifest plus D1-confirmed R2 attachment objects after validating every object size and SHA-256 hash. The POST path accepts a bounded selected list of manifest-returned object keys, requires the matching unexpired package plan token from ADR 0062, and revalidates every key against D1.
- `GET /api/attachments/r2/object` returns one R2 object only after the Worker validates the session, CSRF token, owner/producer role, workspace scope, object-key prefix, and matching D1 `stored_r2` row.

The manifest and package dry run are capped. The package ZIP route enforces a 25 MB source-byte cap, never lists R2 keys, and reads only D1-confirmed object keys. Browser-selected package keys are treated as hints and must match D1 rows for the authenticated workspace. The object route does not list R2 keys, does not trust browser-supplied attachment metadata, and serves bytes only for the exact D1-confirmed object key.

The web app exposes `Export manifest`, `Package attachments`, `Download package`, and `Download latest attachment` actions in the import inspector. The package action reports the D1-confirmed object count and total byte size. The package and object download actions verify downloaded blob SHA-256 values against Worker metadata, save files locally, and record local audit events without mutating workspace records.

## Consequences

- Attachment byte export remains behind Worker authorization instead of direct browser R2 access.
- D1 remains the source of truth for workspace ownership and stored attachment state.
- Backup ZIP payloads still keep attachment manifests metadata-only until a deliberate restore/export packaging flow is added.
- Object-download expiry policy and destructive restore application remain future work. ADR 0063 adds bounded single-range support for protected individual attachment object downloads, ADR 0064 adds bounded single-range support for protected package ZIP downloads, and ADR 0065 adds bounded pagination for stored attachment manifests and package plans.
