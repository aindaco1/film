# ADR 0187: Invite Suppression and Replacement Atomicity

## Status

Accepted.

## Decision

With D1 bound, invite creation returns 503 if the hash-only suppression check cannot complete or if the invite row cannot be persisted. Neither failure calls Resend or exposes a token.

Revoking previous pending invites for a workspace/email hash and inserting the replacement execute in one D1 `batch()`. Cloudflare documents batched statements as transactional, with the sequence rolled back when a statement fails: <https://developers.cloudflare.com/d1/worker-api/d1-database/#batch>.

## Context

A failed suppression query previously looked the same as “not suppressed,” allowing live delivery to continue. Invite persistence failures could also produce a nominal success. Finally, replacement creation used two auto-commit statements, so an insert failure after revocation could invalidate the previous invite without creating a replacement.

## Consequences

- Suppression uncertainty blocks invite creation and email delivery.
- A live invite is not reported or delivered until its D1 row exists.
- Replacement failure preserves the previous pending invite.
- Local no-D1 dry-run invites continue to expose their deterministic development token.
