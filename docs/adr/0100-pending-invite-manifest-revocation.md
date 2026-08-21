# ADR 0100: Pending Invite Manifest Revocation

Date: 2026-07-08

## Status

Accepted.

## Decision

Add protected Worker routes for pending invite review and revocation:

- `POST /api/invites/manifest`
- `POST /api/invites/revoke-dry-run`

The manifest route requires an owner/producer D1-backed mutation session when auth storage is available, verifies workspace scope, and returns pending invite IDs, workspace IDs, email hashes, roles, status, expiry timestamps, and created timestamps. It does not return raw invite email addresses, invite token hashes, or development invite tokens.

The revoke route requires the same authorization and rejects producer attempts to revoke owner invites. It marks a pending invite revoked only after selecting a row that exactly matches workspace ID, invite ID, email hash, role, and pending status.

The Team panel adds `Review pending invites` and per-row `Revoke` controls. After a successful revoke, the browser removes the row from the visible manifest and decrements the count.

## Context

ADR 0050 added dry-run invite create/accept flows. ADR 0087 added a hash-only delivery outbox. Owners and producers could create and accept invites, but they could not review or cancel pending invites from the application.

Production invite delivery is still intentionally blocked on sender domain, public route, webhook, suppression, abuse-control, and provider credential decisions. Pending invite lifecycle management can still ship safely as a D1-backed dry-run because it operates only on hash-only metadata.

## Consequences

- Owners/producers can clean up pending invites before live delivery exists.
- The browser still never receives raw invite email addresses or token hashes from a manifest.
- Revocation is stale-row resistant because the Worker requires exact manifest metadata before mutating a row.
- Live delivery work still needs separate token lifecycle, webhook, bounce, suppression, and abuse controls.
