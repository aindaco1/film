# ADR 0203: Guarded Invite Acceptance and Revocation

Date: 2026-07-09

## Status

Accepted

## Decision

Invite acceptance begins its D1 transaction with an exact assertion that the invite remains pending, unaccepted, and unchanged. It then asserts the expected member-email identity state, creates or updates the member role, activates member status, consumes the invite token, and inserts hash-only audit evidence in the same `batch()`.

Invite revocation similarly asserts the exact pending invite before changing status and inserting audit evidence. Member, status, invite-consumption/revocation, and audit writes must report their expected changed-row counts. Any assertion, write, audit, or storage failure returns 503 and D1 rolls back the sequence.

## Context

ADR 0188 grouped membership writes and invite consumption in one D1 batch, but the conditional consume statement ran last. D1 does not roll back a batch merely because an update changes zero rows, so a concurrent acceptance could allow earlier member/status writes to commit before the helper returned an invalid-token response. Acceptance and revocation audit events were also inserted by the route after their state transitions.

## Consequences

- A stale or concurrently consumed invite fails before membership state changes.
- Invite membership activation, one-time token consumption, and hash-only audit evidence commit or roll back together.
- Exact invite revocation and its audit evidence commit or roll back together.
- Local D1 smoke forces invite delivery to dry-run and verifies accepted/revoked states without sending external email.
