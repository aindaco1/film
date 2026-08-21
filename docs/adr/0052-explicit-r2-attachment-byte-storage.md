# ADR 0052: Explicit R2 Attachment Byte Storage

Date: 2026-07-08

## Status

Accepted

## Decision

Add an explicit Worker-owned attachment object upload path:

`PUT /api/attachments/r2/upload-object`

The route stores bytes in the `ATTACHMENTS` R2 binding only when all of these are true:

- The caller has a valid protected mutation session and CSRF header when D1 auth storage is available.
- The request workspace matches the authenticated D1 session workspace.
- The request includes `x-film-storage-confirmation: STORE <workspaceId>`.
- A matching D1 upload intent exists for workspace, doc id, object key, size, SHA-256, and hashed commit token.
- The received byte length and SHA-256 match the prepared intent metadata.

The Notion import flow still stages attachment blobs locally and performs metadata-only prepare/commit dry runs first. A separate `Store attachments` UI action reads staged blobs from IndexedDB, prepares fresh intents, sends bytes to the Worker upload route, and marks matching docs `stored_r2` only after the Worker confirms storage.

## Context

Earlier R2 work intentionally stopped at prepare/commit dry runs so the app could validate object keys, sizes, hashes, and idempotent commit metadata before production object storage. The Cloudflare `ATTACHMENTS` R2 binding now exists, and staged Notion blobs need a controlled path to durable object storage without silently uploading during import.

## Consequences

- Raw attachment bytes move to the Worker/R2 only after an explicit user action.
- Workspace JSON, operation payloads, and encrypted backup manifests remain metadata-only for attachments.
- D1 upload intents remain the authorization and idempotency record for R2 object writes.
- Attachment restore/export byte handling is still future work; stored object keys are now available for that path.
