# ADR 0219: Atomic SMS Consent and STOP

## Status

Accepted. Production webhook activation and all live sends remain blocked.

## Context

ADR 0213 selected Telnyx and ADR 0215 defined encrypted recipient and append-only compliance tables. Film still lacked a route that could safely record approved consent, an operator revocation path, and durable signed STOP processing. Enabling a webhook before those writes were atomic would risk acknowledging an opt-out without applying it.

## Decision

Add owner/producer-only consent, revocation, and manifest routes. Consent requires canonical E.164 input, a versioned disclosure, allowlisted categories, an optional active workspace member, and a unique evidence ID. The Worker derives a workspace-scoped HMAC lookup, encrypts the number with record-bound AES-GCM additional data, and atomically writes current state, append-only evidence, and bounded audit metadata. Exact evidence replays are idempotent; changed reuse conflicts. Revocation uses an opaque recipient ID, clears categories, suppresses pending attempts, and appends evidence atomically.

Add a Telnyx messaging webhook that returns 404 unless `TELNYX_WEBHOOK_MODE=live`. When enabled, it verifies the exact raw body and timestamp with the configured Ed25519 public key before extracting sender/destination numbers. A secret receiving-number mapping selects the workspace. Signed events are deduplicated in D1. STOP atomically records the event, revokes the recipient, appends evidence, suppresses pending attempts, and audits only bounded booleans/counts. START records provider opt-in but does not restore Film consent. HELP records evidence without message text.

The browser may review the redacted manifest but does not expose consent enrollment until disclosure and collection policy are approved. ADR 0222 adds the disabled-by-default outbound adapter and opaque-recipient composer without changing that enrollment boundary.

## Consequences

- Film can prove consent and apply revocation without placing phone numbers, hashes, ciphertext, source event IDs, or message text in ordinary responses/audits.
- Provider retries are safe and a storage failure remains fail closed so Telnyx retries instead of losing STOP.
- Operators must preserve both SMS keys and configure every receiving number to exactly one workspace before webhook activation.
- START alone is insufficient consent; a current Film disclosure must be accepted through the protected consent route.
