# ADR 0213: Telnyx for Crew Transactional SMS

Date: 2026-07-10

## Status

Accepted for MVP implementation. Live delivery remains blocked.

## Decision

Use Telnyx as Film's first SMS provider through one registered U.S. 10DLC messaging profile. MVP messages are limited to consented crew operations:

- call-sheet availability and delivery notices
- production schedule changes
- time-sensitive safety or location alerts

Investor updates, fundraising, promotion, bulk marketing, and background campaigns are outside the SMS v1 boundary. Film will not send live SMS until every live gate below is implemented and verified.

## Comparison

Rates are U.S. list prices checked on 2026-07-10 and exclude carrier, registration, tax, and other pass-through fees.

| Provider | Base SMS price | Relevant documented capabilities | MVP assessment |
| --- | ---: | --- | --- |
| Telnyx | $0.004 per message part, inbound and outbound | Ed25519-signed webhooks, final delivery events, retries, failover URL, advanced opt-in/out | Selected: best cost and control balance |
| Twilio | $0.0083 per segment, inbound and outbound | Signed webhooks, delivery callbacks, Messaging Services, advanced opt-out | Strong fallback; higher base cost |
| Bandwidth | $0.004 outbound 10DLC | Direct-to-carrier positioning, delivery webhooks, at-least-once callback retries | Strong high-volume option; not selected for the first self-serve integration |
| Plivo | $0.0077 inbound and outbound long-code SMS | Delivery reports and automatic U.S./Canada DND opt-out handling | Lower differentiation at current list price |

Primary sources:

- https://telnyx.com/pricing/messaging
- https://developers.telnyx.com/docs/messaging/messages/receiving-webhooks
- https://developers.telnyx.com/docs/messaging/messages/advanced-opt-in-out
- https://support.telnyx.com/en/articles/5634625-10dlc-fees-and-charges
- https://www.twilio.com/en-us/sms/pricing/us
- https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out
- https://www.twilio.com/docs/usage/webhooks/webhooks-security
- https://www.bandwidth.com/pricing/
- https://dev.bandwidth.com/docs/messaging/webhooks/
- https://www.plivo.com/sms/pricing/us/
- https://docs.plivo.com/docs/messaging/concepts/dnd-service

## Live Gates

1. Create and verify the Telnyx account, messaging profile, dedicated number, brand, and matching 10DLC campaign.
2. Add a versioned crew consent record with timestamp, source, disclosure version, message categories, and revocation state. Consent must not be inferred from workspace membership.
3. Encrypt E.164 recipient values at rest, index only a one-way normalized-number hash, and exclude numbers and message bodies from ordinary audit metadata.
4. Enforce category allowlists, recipient and segment caps, project scope, role authorization, quiet hours, and an explicit emergency override audit.
5. Verify Telnyx Ed25519 signatures against the exact raw request body, reject stale timestamps, and deduplicate provider event IDs in D1.
6. Apply STOP and revocation events before any later outbound send. HELP and re-subscription behavior must match the registered campaign.
7. Persist bounded delivery state and error codes, not an indefinite message-content archive. Approve a retention and deletion schedule before live mode.
8. Add local signature fixtures, dry-run send plans, webhook replay tests, provider failure tests, and one approved live-number smoke before enabling `SMS_MODE=live`.

## Consequences

- Film can implement against a named provider and concrete webhook contract without storing credentials or enabling sends yet.
- Telnyx's lower base rate preserves room for carrier and 10DLC fees without weakening signature, failover, or opt-out requirements.
- Twilio remains the fallback if onboarding, support, or measured delivery quality is materially worse during the controlled live smoke.
- The provider adapter must remain replaceable; canonical consent and delivery records belong to Film, not to Telnyx-specific browser state.

## Implementation Progress

- `POST /api/providers/sms/send-dry-run` accepts only workspace/project IDs, an allowlisted crew category, aggregate recipient/consent counts, estimated segments, and an optional safety override flag.
- The dry-run rejects recipient arrays and message bodies, enforces complete declared consent coverage, caps a plan at 50 recipients and 150 estimated segments, and always returns `liveSendAllowed: false`.
- The Worker has an isolated raw-body Ed25519 verifier with a five-minute replay window and a bounded Telnyx event normalizer. The normalized result excludes phone numbers, message text, provider error detail, and media URLs.
- The public messaging webhook is implemented but returns 404 unless its explicit live gate, Ed25519 public key, receiving-number/workspace mapping, HMAC key, and D1 storage are configured. Signed fixtures cover durable deduplication, hash-only recipient matching, transactional STOP revocation, pending-attempt suppression, START non-reactivation, and redacted responses/audits.
- Migration `0033_sms_compliance_records.sql`, ADR 0215, and ADR 0219 define and implement protected encrypted consent, opaque-ID revocation, append-only evidence, content-free delivery attempts, and redacted webhook events. No production recipient or provider event has been written.
- ADR 0222 implements a protected outbound adapter with opaque recipient IDs, transient message content, category/member/quiet-hours checks, deterministic replay protection, ten-recipient and segment caps, emergency reason codes, signed delivery-status reconciliation, and scheduled terminal-metadata retention. Production `SMS_MODE` remains disabled pending external account and policy gates.
