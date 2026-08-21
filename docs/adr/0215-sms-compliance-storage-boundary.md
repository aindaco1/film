# ADR 0215: SMS Compliance Storage Boundary

Date: 2026-07-10

## Status

Accepted for schema implementation. No live SMS writes are enabled.

## Decision

Keep SMS identity and compliance state in Worker-owned D1 tables introduced by migration `0033_sms_compliance_records.sql`:

- `sms_recipients` stores a workspace-scoped normalized-number hash, encrypted E.164 value, encryption-key version, current consent state, disclosure version, allowlisted categories, and bounded timestamps.
- `sms_consent_events` is the append-only consent/revocation history. Provider STOP, START, and HELP events can be deduplicated by their source event ID without storing inbound text.
- `sms_delivery_attempts` stores recipient hash, category, segment count, bounded status/error codes, and provider IDs. It has no message-body column.
- `telnyx_webhook_events` stores only the bounded metadata emitted by the isolated normalizer. It has no phone-number, message-text, media, or provider error-detail column.

Use a dedicated SMS encryption key and a separate HMAC key for recipient lookup. Do not reuse the Google token-encryption key or use plain SHA-256 for low-entropy phone-number identity.

## Transaction Rules

1. Creating or replacing consent must atomically update `sms_recipients`, append `sms_consent_events`, and write bounded audit evidence.
2. A verified STOP webhook must atomically insert the deduplicated Telnyx event, revoke the matching recipient, append the consent event, suppress pending attempts, and write audit evidence before returning `2xx`.
3. START records provider opt-in state but does not restore Film consent by itself; a current Film disclosure must be accepted before the recipient becomes active again.
4. A send transaction must reassert active category-specific consent and project scope before creating delivery attempts.
5. Provider event retries are idempotent through `provider_event_id` and `source_event_id`; duplicate delivery cannot apply state twice.

## Consequences

- Recipient identity can be matched and revoked without appearing in ordinary audit/event metadata.
- Consent history remains inspectable without retaining inbound message content.
- Backups and exports must continue to exclude ciphertext, recipient hashes, provider IDs, and SMS compliance tables by default.
- ADR 0219 implements the protected consent/revocation routes and an explicitly gated signed STOP webhook with these atomic rules. Production webhook activation and every live-send route remain blocked until provider resources, disclosure/retention approval, key rotation policy, and an owned-number smoke are complete.
