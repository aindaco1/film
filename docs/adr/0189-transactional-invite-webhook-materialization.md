# ADR 0189: Transactional Invite Webhook Materialization

## Status

Accepted.

## Decision

A verified Resend invite-delivery callback materializes its deduplicated event row, linked delivery-attempt status, and optional bounce/complaint/suppression row in one D1 `batch()`. Event IDs derive from the validated Svix message ID, making a provider retry refer to the same stored event.

When D1 is bound or live invite delivery is enabled, lookup or batch failure returns `503 resend_webhook_persistence_unavailable`. The callback is not acknowledged as successful, allowing provider retry.

## Context

The previous flow inserted the dedupe event first and updated attempt/suppression state afterward. If a downstream write failed, the retry was classified as a duplicate and skipped the missing suppression, allowing future mail to an address that bounced or complained.

## Consequences

- Event, attempt state, and suppression state commit together.
- A failed materialization is retryable and does not leave a dedupe marker by itself.
- Duplicate callbacks can safely re-run idempotent attempt/suppression statements while retaining one event row.
- Raw webhook payloads and recipient addresses remain outside D1 storage.
