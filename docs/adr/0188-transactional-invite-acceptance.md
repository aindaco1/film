# ADR 0188: Transactional Invite Acceptance

## Status

Accepted.

## Decision

Invite acceptance writes the member role, active member status, and invite consumption in one D1 `batch()`. The route reports success only when the conditional invite-consumption statement changes exactly one pending row.

## Context

Those writes previously auto-committed independently. A failure after creating or activating the member but before consuming the invite could leave partial membership state and a reusable token.

## Consequences

- Acceptance either applies the membership state and consumes the invite together or rolls the sequence back.
- A stale or concurrently consumed invite does not produce a successful response.
- D1 failures return 503 without creating a member or consuming the invite.
- Invite tokens remain hash-only in storage.
