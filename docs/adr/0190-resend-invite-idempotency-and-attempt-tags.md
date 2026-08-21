# ADR 0190: Resend Invite Idempotency and Attempt Tags

## Status

Accepted.

## Decision

Every live workspace-invite send includes `Idempotency-Key: film-invite/<inviteId>` and a non-PII `film_delivery_attempt` tag containing the D1 delivery-attempt ID. Resend documents 24-hour idempotent send handling and propagation of send tags into signed webhook payloads:

- <https://resend.com/docs/dashboard/emails/idempotency-keys>
- <https://resend.com/docs/dashboard/emails/tags>

Webhook processing first links by provider message ID. If that ID was not persisted after sending, it may link by the validated attempt tag only when the D1 attempt has no provider ID or the same provider ID. The transactional webhook batch then backfills the provider ID and applies event/suppression state.

## Context

Resend can accept an email before Film's follow-up D1 provider-ID update completes. Without another correlation value, later bounce or complaint callbacks cannot find the target hash, and retrying a send risks duplicate mail.

## Consequences

- Retrying the same invite send within Resend's idempotency window does not duplicate email.
- Signed callbacks can recover the exact D1 attempt after an outbound persistence failure.
- The tag contains no email address, token, workspace name, or provider credential.
- A mismatched tag/provider-ID pair cannot relink an attempt.
