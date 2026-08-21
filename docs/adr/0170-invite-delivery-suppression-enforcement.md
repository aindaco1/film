# ADR 0170: Invite Delivery Suppression Enforcement

## Status

Accepted.

## Decision

Before creating a workspace invite, the Worker computes the target email hash and checks `invite_delivery_suppressions` for a matching Resend target hash. If a suppression exists, `POST /api/invites/create-dry-run` returns `409 invite_delivery_suppressed` with bounded suppression metadata and records an audit event.

The route does not create a workspace invite row, does not create an invite delivery attempt, and does not call Resend for suppressed targets.

## Context

ADR 0167 stored hash-only suppressions from bounced, complained, and suppressed Resend webhook events. ADR 0168 exposed those rows through a protected manifest. The missing MVP behavior was enforcement before future invite sends.

## Consequences

- Suppressed recipients are blocked by hash without storing or returning raw email addresses.
- Live and dry-run invite creation share the same suppression gate.
- D1-unavailable local development remains dry-run, because the Worker cannot prove a suppression exists.
- Future support workflows can add owner/producer review or suppression overrides as separate, audited routes.
