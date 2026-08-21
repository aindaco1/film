# ADR 0167: Resend Invite Delivery State And Suppressions

## Status

Accepted

## Decision

Materialize verified Resend invite-delivery webhooks into two bounded D1 surfaces:

- `invite_delivery_attempts.last_event_status` and `last_event_at` hold the latest signed provider event for a linked live invite delivery attempt.
- `invite_delivery_suppressions` stores hash-only suppression evidence for bounced, complained, or suppressed events, keyed by provider, target hash, and suppression reason.

The webhook route still stores the normalized event row first and ignores duplicate Svix message IDs. Only non-duplicate signed events update delivery attempt state or suppression rows. Suppression records link back to the workspace, invite, delivery attempt, provider message ID, and source webhook event when those values are known from the existing live delivery attempt. Raw webhook payloads and raw recipient addresses are not stored.

## Context

ADR 0166 added signature verification and bounded webhook event storage. That proved the provider callback boundary, but live invite delivery still needed durable state that operators can use for bounce and suppression review before public launch.

The safest next step is to materialize status from already verified events rather than adding new sends, browser-visible raw delivery payloads, or provider API reads.

## Consequences

- Linked live invite attempts now have a durable latest provider event without changing the original send status.
- Bounce, complaint, and suppression events create hash-only review records.
- Replayed provider webhooks remain idempotent by Svix message ID.
- Production launch still needs an operating policy for future send blocking, support review, and retention around suppression records.
