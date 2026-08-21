# ADR 0196: Recoverable Attachment Restore Finalization

Date: 2026-07-09

## Status

Accepted

## Decision

Use a deterministic `prepared` attachment upload intent as the durable reservation before writing restored bytes to R2. After the create-only R2 put succeeds, finalize the intent as `stored_r2`, insert the destructive `restore_attachment_object_commits` row, and insert bounded audit evidence in one D1 batch.

The reservation identity is derived from the workspace, commit preflight, document, destination key, and expected SHA-256. It stores a hashed commit identity and a preflight-scoped storage marker. A retry may reuse an existing R2 object only when the prepared reservation and R2 custom metadata exactly match the request chain, size, document, workspace, hash, and destination. Matching recovery remains available after the normal 15-minute preflight window because the reservation proves the original attempt began while the preflight was valid.

If D1 finalization fails, the Worker checks for a concurrently completed matching commit before compensating. Otherwise it deletes only an R2 object whose metadata still matches the reservation, confirms destination absence, and releases the prepared intent. When R2 cleanup cannot be confirmed, the Worker leaves the prepared intent in place and returns `r2_restore_compensation_pending`; a matching authenticated retry can finalize the existing verified object without uploading it again.

## Context

The prior path wrote R2 first, inserted a `stored_r2` upload intent, inserted the restore commit in a second D1 call, and recorded audit evidence afterward. Cleanup failures were ignored. A failure could therefore leave an orphaned R2 object or D1 intent that permanently failed the no-overwrite destination check, while successful bytes and commit evidence could exist without audit evidence.

## Consequences

- D1 intent state, destructive commit evidence, and audit evidence finalize atomically.
- Confirmed compensation returns the destination to an absent, retryable state.
- Unconfirmed R2 compensation remains recoverable through a narrowly matched prepared reservation.
- Concurrent matching requests cannot cause a failed request to delete another request's completed object.
- D1 and R2 still cannot share a transaction; the prepared reservation and verified retry contract make that split explicit.
